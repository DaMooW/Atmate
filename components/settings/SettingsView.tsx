import { useState } from 'react';
import { ApiConfigList } from './ApiConfigList';
import { RoleList } from './RoleList';
import { PrefsPanel } from './PrefsPanel';

/**
 * 设置视图（tech §4 三个一级视图之一）。
 * T1.2 实现 API 配置 tab；角色/偏好 tab 在后续任务实现。
 */
type SettingsTab = 'api' | 'roles' | 'prefs';

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('api');

  return (
    <div className="flex h-full flex-col">
      {/* Tab 栏 */}
      <div className="flex shrink-0 border-b border-border">
        <TabButton active={tab === 'api'} onClick={() => setTab('api')}>
          API 配置
        </TabButton>
        <TabButton active={tab === 'roles'} onClick={() => setTab('roles')}>
          角色
        </TabButton>
        <TabButton active={tab === 'prefs'} onClick={() => setTab('prefs')}>
          偏好
        </TabButton>
      </div>

      {/* Tab 内容 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'api' && <ApiConfigList />}
        {tab === 'roles' && <RoleList />}
        {tab === 'prefs' && <PrefsPanel />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
