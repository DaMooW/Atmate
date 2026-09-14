import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { SettingsView } from './settings/SettingsView';
import { ChatView } from './chat/ChatView';

/**
 * Side Panel 根组件（tech §4）。
 * 两个一级视图：对话（默认）/ 设置。
 */
export type View = 'chat' | 'settings';

export function App() {
  const [view, setView] = useState<View>('chat');

  return (
    <div className="flex h-full">
      <Sidebar currentView={view} onNavigate={setView} />
      <main className="min-w-0 flex-1">
        {view === 'chat' && <ChatView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
