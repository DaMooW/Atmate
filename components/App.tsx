import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { SettingsView } from './settings/SettingsView';
import { ChatView } from './chat/ChatView';
import { SessionList } from './chat/SessionList';

/**
 * Side Panel 根组件（tech §4）。
 * 两个一级视图：对话（默认）/ 设置；对话视图可展开会话列表。
 */
export type View = 'chat' | 'settings';

export function App() {
  const [view, setView] = useState<View>('chat');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionListOpen, setSessionListOpen] = useState(false);

  return (
    <div className="relative flex h-full bg-bg text-text">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        sessionListOpen={sessionListOpen}
        onToggleSessionList={() => setSessionListOpen(!sessionListOpen)}
      />
      <main className="min-w-0 flex-1">
        {view === 'chat' && (
          <ChatView
            currentSessionId={currentSessionId}
            onSessionChange={setCurrentSessionId}
            onNavigateToSettings={() => setView('settings')}
          />
        )}
        {view === 'settings' && <SettingsView />}
      </main>

      {/* 遮罩层：抽屉打开时覆盖主内容区，点击关闭 */}
      {view === 'chat' && sessionListOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/30"
          onClick={() => setSessionListOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 会话列表抽屉：从导航栏右侧滑出，覆盖主内容区 */}
      {view === 'chat' && (
        <SessionList
          isOpen={sessionListOpen}
          currentSessionId={currentSessionId}
          onSelect={setCurrentSessionId}
          onClose={() => setSessionListOpen(false)}
        />
      )}
    </div>
  );
}
