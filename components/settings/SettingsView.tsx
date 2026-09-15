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
        <TabButton active={tab === 'api'} onClick={() => setTab('api')} icon="server">
          API 配置
        </TabButton>
        <TabButton active={tab === 'roles'} onClick={() => setTab('roles')} icon="user">
          角色
        </TabButton>
        <TabButton active={tab === 'prefs'} onClick={() => setTab('prefs')} icon="sliders">
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
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: 'server' | 'user' | 'sliders';
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    server: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
    user: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    sliders: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon && icons[icon]}
      {children}
    </button>
  );
}
