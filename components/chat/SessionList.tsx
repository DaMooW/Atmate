import { useState, useEffect } from 'react';
import { useStorageStore } from '../../infra/storage/store';
import { generateId } from '../../core/id';
import type { Session, Role } from '../../core/types';

/**
 * 会话列表面板（spec M1 T1.7 / UI 改版 T-UI.1）。
 * 抽屉覆盖层模式：从导航栏右侧滑出，覆盖主内容区，不挤压布局。
 * 展示所有会话，支持切换/新建/重命名/删除，按 updatedAt 降序。
 */
interface Props {
  /** 抽屉是否打开 */
  isOpen: boolean;
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onClose?: () => void;
}

export function SessionList({ isOpen, currentSessionId, onSelect, onClose }: Props) {
  const { sessions, setSessions, roles } = useStorageStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewSession, setShowNewSession] = useState(false);

  // Escape 键关闭抽屉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 按 updatedAt 降序
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleNewSession = (role: Role) => {
    const now = Date.now();
    const newSession: Session = {
      id: generateId(),
      roleId: role.id,
      title: '新会话',
      messages: [],
      cumulativeTokens: 0,
      createdAt: now,
      updatedAt: now,
    };
    setSessions([newSession, ...sessions]);
    onSelect(newSession.id);
    setShowNewSession(false);
    onClose?.();
  };

  const handleRename = (sessionId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    const updated = sessions.map((s) =>
      s.id === sessionId ? { ...s, title: trimmed, updatedAt: Date.now() } : s,
    );
    setSessions(updated);
    setRenamingId(null);
  };

  const handleDelete = (sessionId: string) => {
    if (!confirm('确定删除此会话？此操作不可撤销。')) return;
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      // 删除当前会话时，切换到最近一个或 null
      const remaining = updated.sort((a, b) => b.updatedAt - a.updatedAt);
      onSelect(remaining[0]?.id ?? '');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`absolute top-0 bottom-0 left-16 z-40 flex w-64 flex-col border-r border-border bg-surface shadow-lg transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-[-100%]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">会话</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setShowNewSession(!showNewSession)}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
            title="新建会话"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
              title="关闭"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showNewSession && (
        <div className="border-b border-border p-3">
          <p className="mb-2 text-xs text-text-muted">选择角色</p>
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleNewSession(role)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                {role.name}
              </button>
            ))}
            {roles.length === 0 && <p className="text-xs text-text-muted">请先在设置中创建角色</p>}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sortedSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">暂无会话，点击 + 新建</div>
        ) : (
          <ul>
            {sortedSessions.map((session) => (
              <li key={session.id}>
                {renamingId === session.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(session.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => handleRename(session.id)}
                      autoFocus
                      className="input flex-1 py-1 text-xs"
                    />
                  </div>
                ) : (
                  <div
                    className={`group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-surface-2 ${
                      currentSessionId === session.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      onSelect(session.id);
                      onClose?.();
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{session.title}</p>
                      <p className="text-xs text-text-muted">{formatTime(session.updatedAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(session.id);
                          setRenameValue(session.title);
                        }}
                        className="rounded p-1 text-text-muted hover:text-text"
                        title="重命名"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id);
                        }}
                        className="rounded p-1 text-text-muted hover:text-danger"
                        title="删除"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
