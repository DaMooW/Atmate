import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * WXT 配置（tech §1 选型 #1 / §10）
 * M0 权限最小集：仅 sidePanel；storage/contextMenus/unlimitedStorage 随对应里程碑追加。
 */
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '在伴 Atmate',
    short_name: 'Atmate',
    description: 'Chrome 侧边栏 AI 角色助手：划词发送，流式应答，token 用量与上下文一目了然。',
    minimum_chrome_version: '114',
    permissions: ['sidePanel'],
    // 侧边栏入口（spec 修订 D8）：`chrome.action.*` 需要 manifest 里存在 `action` 键，
    // 否则该 API 为 undefined。这里**不得**声明 `default_popup`，否则点击图标会弹 popup，
    // `action.onClicked` 不再触发（chrome-extensions 技能：必守规则 2 / 11）。
    // 暂不声明图标：无真实 PNG 就不引用（技能必守规则 1），由 Chrome 使用默认图标。
    action: {},
  },
});
