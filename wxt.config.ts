import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * WXT 配置（tech §1 选型 #1 / §10）
 * M1 权限：sidePanel + storage（持久化会话/角色/配置）；contextMenus 随 M2 追加，unlimitedStorage 随 M4 追加。
 */
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // 构建产物目录（spec 修订 D10）：默认的 `.output/` 是点开头的隐藏目录，
  // macOS 访达与"加载已解压的扩展程序"的文件选择框里都看不到它，故改用非隐藏的 `dist/`。
  outDir: 'dist',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '在伴 Atmate',
    short_name: 'Atmate',
    description: 'Chrome 侧边栏 AI 角色助手：划词发送，流式应答，token 用量与上下文一目了然。',
    minimum_chrome_version: '114',
    permissions: ['sidePanel', 'storage', 'contextMenus', 'webNavigation'],
    // 图标（spec 修订 D9）：由 `node scripts/generate-icons.mjs` 生成的真实 PNG。
    // public/ 下的文件会被原样拷贝到产物根目录，故路径写作 icon/N.png。
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    // 侧边栏入口（spec 修订 D8）：`chrome.action.*` 需要 manifest 里存在 `action` 键，
    // 否则该 API 为 undefined。这里**不得**声明 `default_popup`，否则点击图标会弹 popup，
    // `action.onClicked` 不再触发（chrome-extensions 技能：必守规则 2 / 11）。
    action: {
      default_title: '在伴 Atmate',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  },
});
