import { initPanelState } from './background/panel-state';
import { initContextMenus } from './background/context-menus';
import { handleMessage } from './background/messaging-router';
import { initPdfNavigation } from './background/pdf-navigation';
import type { ExtensionMessage, SelectionSendResponse } from '~/core/messages';

export default defineBackground(() => {
  // M2 T2.5：初始化 sidepanel 打开状态监听（long-lived port）
  initPanelState();

  // M2 T2.3：初始化右键菜单
  initContextMenus();

  // M3 T3.2：初始化 PDF 导航接管
  initPdfNavigation();

  // M2 T2.5：消息路由监听（分流逻辑）
  browser.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      sender,
      sendResponse: (response: SelectionSendResponse) => void,
    ) => {
      return handleMessage(message, sender, sendResponse);
    },
  );

  // M0 · 侧边栏入口（spec 修订 D8）：只声明 `side_panel.default_path` 并不会让面板可打开，
  // 必须另有触发点。这里挂在工具栏图标点击上（manifest 已加 `action: {}` 且无 `default_popup`）。
  browser.action.onClicked.addListener(async (tab) => {
    try {
      await browser.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error('[Atmate] 打开侧边栏失败', error);
    }
  });
});
