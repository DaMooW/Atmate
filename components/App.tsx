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
    <div className="flex h-full">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        sessionListOpen={sessionListOpen}
        onToggleSessionList={() => setSessionListOpen(!sessionListOpen)}
      />
      {view === 'chat' && sessionListOpen && (
        <SessionList
          currentSessionId={currentSessionId}
          onSelect={setCurrentSessionId}
          onClose={() => setSessionListOpen(false)}
        />
      )}
      <main className="min-w-0 flex-1">
        {view === 'chat' && (
          <ChatView currentSessionId={currentSessionId} onSessionChange={setCurrentSessionId} />
        )}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
