import { useState, useRef, useCallback, useEffect } from 'react';
import { MessageList } from './MessageList';
import { Composer, type ComposerHandle } from './Composer';
import { TokenStatusBar } from './TokenStatusBar';
import { MaterialCardList } from './MaterialCardList';
import { buildUserPrompt } from './promptBuilder';
import type { MaterialCard, MaterialTarget } from './materialTypes';
import { useStorageStore } from '../../infra/storage/store';
import { streamChat } from '../../infra/llm/client';
import { generateId } from '../../core/id';
import { generateSessionTitle, upsertSessionMessages } from '../../core/session';
import { DEFAULT_ROLE_ID } from '../../core/builtinRoles';
import {
  estimateMessagesTokens,
  isContextLimitReached,
  estimateRoundTokens,
} from '../../core/tokens';
import type { ChatMessage, Session } from '../../core/types';
import type { StreamChatHandle } from '../../infra/llm/client';
import type { SelectionSendPayload } from '../../core/messages';

/**
 * 对话视图（spec M1 T1.5，M2 T2.4 扩展）。
 * 集成 LLM 客户端：发送 → 流式渲染 → 存盘；停止；错误展示 + 重试。
 *
 * M2 扩展：监听 AT_SELECTION_DELIVER，创建素材卡片；采用后填入输入框。
 */
interface Props {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  /** 导航到设置视图的回调（空状态引导用） */
  onNavigateToSettings?: () => void;
}

export function ChatView({ currentSessionId, onSessionChange, onNavigateToSettings }: Props) {
  const { apiConfigs, activeApiConfigId, roles, sessions, setSessions, uiPrefs } =
    useStorageStore();

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamHandleRef = useRef<StreamChatHandle | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const composerRef = useRef<ComposerHandle>(null);

  // M2 T2.4：素材卡片状态
  const [materialCards, setMaterialCards] = useState<MaterialCard[]>([]);
  // 素材落点：默认当前激活会话，无激活会话则新建（D7）
  const [materialTarget, setMaterialTarget] = useState<MaterialTarget>({
    sessionId: currentSessionId,
    sessionName: currentSessionId ? '当前会话' : '新会话',
  });

  // 同步 currentSessionId 变化到 materialTarget
  useEffect(() => {
    setMaterialTarget((prev) => {
      if (prev.sessionId === currentSessionId) return prev;
      return {
        sessionId: currentSessionId,
        sessionName: currentSessionId ? '当前会话' : '新会话',
      };
    });
  }, [currentSessionId]);

  // M2 T2.4：监听 AT_SELECTION_DELIVER 消息（background 转发的划词素材）
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as { type?: string; payload?: SelectionSendPayload };
      if (msg.type !== 'AT_SELECTION_DELIVER' || !msg.payload) return;

      const payload = msg.payload;
      const newCard: MaterialCard = {
        id: generateId(),
        text: payload.text,
        title: payload.title ?? '',
        url: payload.url ?? '',
        source: payload.source,
        contextScope: uiPrefs.defaultContextScope,
        contextData: payload.contextData,
        userNote: '',
        createdAt: Date.now(),
      };
      setMaterialCards((prev) => [...prev, newCard]);
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [uiPrefs.defaultContextScope]);

  const activeConfig = apiConfigs.find((c) => c.id === activeApiConfigId) ?? null;
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  // 估算当前会话的 token 占用（T1.6，T1.8 完善估算精度）
  const contextUsed = currentSession ? estimateMessagesTokens(currentSession.messages) : 0;
  const contextLimit = activeConfig?.contextLimit ?? 128000;
  const limitReached = isContextLimitReached(contextUsed, contextLimit);

  // 无激活配置/无角色/上下文达限时禁用发送
  const sendDisabled = !activeConfig || roles.length === 0 || limitReached;
  const disabledReason = !activeConfig
    ? '请先在设置中添加并激活 API 配置'
    : roles.length === 0
      ? '请先在设置中创建或恢复默认角色'
      : limitReached
        ? '上下文已满，请新建会话或删除部分消息'
        : undefined;

  /**
   * 获取或创建当前会话。
   * 如果没有当前会话，创建一个新会话（使用默认角色「在伴 Atmate」）。
   */
  const ensureSession = useCallback((): Session => {
    if (currentSession) return currentSession;

    const role = roles.find((r) => r.id === DEFAULT_ROLE_ID) ?? roles[0];
    if (!role) throw new Error('无可用角色');

    const now = Date.now();
    const newSession: Session = {
      id: generateId(),
      roleId: role.id,
      title: '新对话',
      messages: [],
      cumulativeTokens: 0,
      createdAt: now,
      updatedAt: now,
    };
    onSessionChange(newSession.id);
    return newSession;
  }, [currentSession, roles, onSessionChange]);

  /**
   * 更新当前会话的消息并存盘。
   * 会话列表始终以 store 为准（不能用渲染闭包里的 sessions，避免流式期间丢失首次写入的标题）。
   */
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[], title?: string, roleId?: string) => {
      const current = useStorageStore.getState().sessions;
      setSessions(upsertSessionMessages(current, sessionId, messages, { title, roleId }));
    },
    [setSessions],
  );

  /**
   * 发送消息。
   */
  const handleSend = useCallback(
    async (text: string) => {
      if (sendDisabled || streaming) return;
      setError(null);
      lastUserMessageRef.current = text;

      try {
        const session = ensureSession();
        const role = roles.find((r) => r.id === session.roleId);
        if (!role) throw new Error('角色不存在');
        if (!activeConfig) throw new Error('无激活配置');

        const now = Date.now();
        const userMsg: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: text,
          createdAt: now,
        };
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: '',
          createdAt: now + 1,
        };

        const newMessages = [...session.messages, userMsg, assistantMsg];
        const title =
          session.messages.length === 0 ? generateSessionTitle(newMessages) : session.title;
        updateSessionMessages(session.id, newMessages, title, session.roleId);
        setStreamingMessageId(assistantMsg.id);
        setStreaming(true);

        // 历史消息（不含刚添加的 user 和 assistant）
        const history = session.messages;

        const handle = streamChat(activeConfig, role, history, userMsg, {
          baseDirectiveEnabled: uiPrefs.baseDirectiveEnabled,
          onContent: (delta) => {
            // 增量更新末条 assistant 消息
            const current = useStorageStore.getState().sessions.find((s) => s.id === session.id);
            if (!current) return;
            const updatedMsgs = current.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m,
            );
            updateSessionMessages(session.id, updatedMsgs);
          },
          onUsage: (usage) => {
            const current = useStorageStore.getState().sessions.find((s) => s.id === session.id);
            if (!current) return;
            const updatedMsgs = current.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, usage } : m,
            );
            updateSessionMessages(session.id, updatedMsgs);
          },
        });
        streamHandleRef.current = handle;

        await handle.promise;

        // 流式结束后更新会话累计 token（T1.8）
        const currentAfter = useStorageStore.getState().sessions.find((s) => s.id === session.id);
        if (currentAfter) {
          const finalAssistant = currentAfter.messages.find((m) => m.id === assistantMsg.id);
          if (finalAssistant) {
            const roundTokens = estimateRoundTokens(userMsg, finalAssistant);
            const updatedSessions = useStorageStore
              .getState()
              .sessions.map((s) =>
                s.id === session.id
                  ? { ...s, cumulativeTokens: s.cumulativeTokens + roundTokens }
                  : s,
              );
            setSessions(updatedSessions);
          }
        }

        setStreaming(false);
        setStreamingMessageId(null);
        streamHandleRef.current = null;
      } catch (err) {
        setStreaming(false);
        setStreamingMessageId(null);
        streamHandleRef.current = null;
        const message = err instanceof Error ? err.message : '发送失败，请稍后重试';
        setError(message);
      }
    },
    [
      sendDisabled,
      streaming,
      ensureSession,
      roles,
      activeConfig,
      uiPrefs.baseDirectiveEnabled,
      updateSessionMessages,
      setSessions,
    ],
  );

  /**
   * 停止生成。
   */
  const handleStop = useCallback(() => {
    streamHandleRef.current?.abort();
    setStreaming(false);
    setStreamingMessageId(null);
    streamHandleRef.current = null;
  }, []);

  /**
   * 重试（使用最后一条用户消息）。
   */
  const handleRetry = useCallback(() => {
    if (lastUserMessageRef.current) {
      setError(null);
      handleSend(lastUserMessageRef.current);
    }
  }, [handleSend]);

  // ── M2 T2.4：素材卡片操作 ──

  /** 采用单张卡片：组装 prompt 填入输入框，移除卡片 */
  const handleAdoptCard = useCallback((card: MaterialCard) => {
    const prompt = buildUserPrompt({
      selectedText: card.text,
      contextScope: card.contextScope,
      previousParagraph: card.contextData?.beforeParagraph,
      nextParagraph: card.contextData?.afterParagraph,
      pageContent: card.contextData?.fullPage,
      userNote: card.userNote,
    });
    composerRef.current?.appendText(prompt);
    setMaterialCards((prev) => prev.filter((c) => c.id !== card.id));
    composerRef.current?.focus();
  }, []);

  /** 丢弃单张卡片 */
  const handleDiscardCard = useCallback((cardId: string) => {
    setMaterialCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  /** 更新卡片字段 */
  const handleUpdateCard = useCallback((cardId: string, updates: Partial<MaterialCard>) => {
    setMaterialCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c)));
  }, []);

  /** 全部采用 */
  const handleAdoptAll = useCallback(() => {
    materialCards.forEach((card) => {
      const prompt = buildUserPrompt({
        selectedText: card.text,
        contextScope: card.contextScope,
        previousParagraph: card.contextData?.beforeParagraph,
        nextParagraph: card.contextData?.afterParagraph,
        pageContent: card.contextData?.fullPage,
        userNote: card.userNote,
      });
      composerRef.current?.appendText(prompt);
    });
    setMaterialCards([]);
    composerRef.current?.focus();
  }, [materialCards]);

  /** 全部丢弃 */
  const handleDiscardAll = useCallback(() => {
    setMaterialCards([]);
  }, []);

  /** 切换到新会话（D7） */
  const handleSwitchToNewSession = useCallback(() => {
    onSessionChange(''); // 空字符串表示新建会话（ensureSession 会创建）
    setMaterialTarget({ sessionId: null, sessionName: '新会话' });
  }, [onSessionChange]);

  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={currentSession?.messages ?? []}
        streamingMessageId={streamingMessageId}
        error={error}
        onRetry={handleRetry}
        showSetupGuide={apiConfigs.length === 0}
        onNavigateToSettings={onNavigateToSettings}
      />
      {/* M2 T2.4：素材卡片列表（在消息列表和 token 状态条之间） */}
      <MaterialCardList
        cards={materialCards}
        target={materialTarget}
        onSwitchToNewSession={handleSwitchToNewSession}
        onAdopt={handleAdoptCard}
        onDiscard={handleDiscardCard}
        onUpdate={handleUpdateCard}
        onAdoptAll={handleAdoptAll}
        onDiscardAll={handleDiscardAll}
      />
      <TokenStatusBar
        used={contextUsed}
        limit={contextLimit}
        cumulative={currentSession?.cumulativeTokens}
        estimated
      />
      <Composer
        ref={composerRef}
        onSend={handleSend}
        onStop={handleStop}
        streaming={streaming}
        disabled={sendDisabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
