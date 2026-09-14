import { useState, useRef, useCallback } from 'react';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { TokenStatusBar } from './TokenStatusBar';
import { useStorageStore } from '../../infra/storage/store';
import { streamChat } from '../../infra/llm/client';
import { generateId } from '../../core/id';
import {
  estimateMessagesTokens,
  isContextLimitReached,
  estimateRoundTokens,
} from '../../core/tokens';
import type { ChatMessage, Session } from '../../core/types';
import type { StreamChatHandle } from '../../infra/llm/client';

/**
 * 对话视图（spec M1 T1.5）。
 * 集成 LLM 客户端：发送 → 流式渲染 → 存盘；停止；错误展示 + 重试。
 */
interface Props {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
}

export function ChatView({ currentSessionId, onSessionChange }: Props) {
  const { apiConfigs, activeApiConfigId, roles, sessions, setSessions, uiPrefs } =
    useStorageStore();

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamHandleRef = useRef<StreamChatHandle | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

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
   * 如果没有当前会话，创建一个新会话（使用第一个角色）。
   */
  const ensureSession = useCallback((): Session => {
    if (currentSession) return currentSession;

    const role = roles[0];
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
   */
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[], title?: string) => {
      const updated = sessions.map((s) =>
        s.id === sessionId ? { ...s, messages, title: title ?? s.title, updatedAt: Date.now() } : s,
      );
      // 如果是新会话，需要加入 sessions 数组
      if (!sessions.some((s) => s.id === sessionId)) {
        const session = {
          id: sessionId,
          roleId: roles[0]!.id,
          title: title ?? '新对话',
          messages,
          cumulativeTokens: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSessions([session, ...updated]);
      } else {
        setSessions(updated);
      }
    },
    [sessions, roles, setSessions],
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
        const title = session.messages.length === 0 ? text.slice(0, 20) : session.title;
        updateSessionMessages(session.id, newMessages, title);
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

  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={currentSession?.messages ?? []}
        streamingMessageId={streamingMessageId}
        error={error}
        onRetry={handleRetry}
      />
      <TokenStatusBar
        used={contextUsed}
        limit={contextLimit}
        cumulative={currentSession?.cumulativeTokens}
        estimated
      />
      <Composer
        onSend={handleSend}
        onStop={handleStop}
        streaming={streaming}
        disabled={sendDisabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
