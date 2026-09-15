import { createRoot } from 'react-dom/client';
import { App } from '~/components/App';
import { useStorageStore } from '~/infra/storage/store';
import { SIDEPANEL_PORT_NAME } from '~/core/messages';
import '~/assets/style.css';

/**
 * Side Panel 入口。
 * 启动时先从 storage.local 装载数据，再渲染 UI。
 *
 * M2 T2.5（D16）：
 * - 建立 long-lived port 通知 background sidepanel 已打开（用于 panelOpen 状态）
 * - 初始化完成后发送 AT_PANEL_READY，触发暂存素材转发（冷启动竞态）
 */
async function bootstrap() {
  // M2 T2.5：建立 long-lived port，background 通过 onConnect/onDisconnect 维护 panelOpen 状态
  browser.runtime.connect({ name: SIDEPANEL_PORT_NAME });

  await useStorageStore.getState().init();
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  createRoot(root).render(<App />);

  // M2 T2.5：通知 background sidepanel 就绪，触发暂存素材转发（冷启动竞态）
  browser.runtime.sendMessage({ type: 'AT_PANEL_READY' });
}

void bootstrap();
