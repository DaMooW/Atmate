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
  },
});
