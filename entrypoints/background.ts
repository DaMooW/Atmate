export default defineBackground(() => {
  // 薄路由层（tech §8）：无业务状态，一切真相在 storage，SW 随时被杀重启无影响（ADR-006）。
  // 右键菜单注册与消息中继随 M2/M3 填充。
  //
  // M0 · 侧边栏入口（spec 修订 D8）：只声明 `side_panel.default_path` 并不会让面板可打开，
  // 必须另有触发点。这里挂在工具栏图标点击上（manifest 已加 `action: {}` 且无 `default_popup`）。
  // 不用 `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`：那一行开关没有回调，
  // M1/M2 无法在打开面板前后做落点判定（如无激活会话则新建，见 roadmap T2.4）。
  browser.action.onClicked.addListener(async (tab) => {
    try {
      await browser.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      // SW 无 UI 可提示，先落控制台；统一错误出口留到 M1（NFR-4 中文提示）。
      console.error('[Atmate] 打开侧边栏失败', error);
    }
  });
});
