import type { View } from './App';

/**
 * 左侧导航栏（tech §4 App → Sidebar）。
 * 会话列表/对话/设置三个入口。
 */
interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
  sessionListOpen: boolean;
  onToggleSessionList: () => void;
}

export function Sidebar({ currentView, onNavigate, sessionListOpen, onToggleSessionList }: Props) {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-3">
      <NavButton active={sessionListOpen} onClick={onToggleSessionList} title="会话列表">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6l-3 3V4a1 1 0 0 1 1-1z" />
          <path d="M3 9h18" />
        </svg>
      </NavButton>
      <NavButton active={currentView === 'chat'} onClick={() => onNavigate('chat')} title="对话">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </NavButton>
      <div className="flex-1" />
      <NavButton
        active={currentView === 'settings'}
        onClick={() => onNavigate('settings')}
        title="设置"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </NavButton>
    </aside>
  );
}

function NavButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
