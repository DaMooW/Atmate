import { useState } from 'react';
import { Main } from './Main';
import { Sidebar } from './Sidebar';
import { SettingsView } from './settings/SettingsView';

/**
 * Side Panel 根组件（tech §4）。
 * 三个一级视图：对话（默认）/ 会话列表 / 设置。
 * T1.2 实现设置视图的 API 配置部分。
 */
export type View = 'chat' | 'settings';

export function App() {
  const [view, setView] = useState<View>('chat');

  return (
    <div className="flex h-full">
      <Sidebar currentView={view} onNavigate={setView} />
      <main className="min-w-0 flex-1">
        {view === 'chat' && <Main />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
