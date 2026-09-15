import { createSelectionMonitor } from './content/selection/monitor';

export default defineContentScript({
  // 注入声明：all_urls · document_idle（tech §3）。
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // M2 T2.1：选区监听 + 有效性判定。
    // 有效选区时触发回调（T2.2 浮动按钮显示 / T2.5 消息分流在此填充）；
    // 无效选区时隐藏浮动按钮（T2.2 实现后接入）。
    createSelectionMonitor({
      onValidSelection: () => {
        // T2.2：显示浮动按钮（定位到选区右下角）
        // T2.5：发送 AT_SELECTION_SEND 给 background，根据 panelOpen 状态分流
      },
      onInvalidSelection: () => {
        // T2.2：隐藏浮动按钮
      },
    });
  },
});
