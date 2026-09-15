import { createSelectionMonitor } from './content/selection/monitor';
import { createFloatButton } from './content/float-button';
import { calcButtonPosition } from './content/float-button/position';
import {
  collectSelectionPayload,
  sendSelection,
  sendFloatButtonClick,
} from './content/messaging/send';

export default defineContentScript({
  // 注入声明：all_urls · document_idle（tech §3）。
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // M2 T2.2：创建浮动按钮（Shadow DOM 隔离）
    const floatButton = createFloatButton(async () => {
      // 点击浮动按钮：隐藏按钮 + 通知 background 打开侧边栏并转发暂存素材
      floatButton.hide();
      await sendFloatButtonClick();
    });

    // 页面滚动时重新定位浮动按钮（如果可见）
    const handleScroll = () => {
      if (!floatButton.isVisible()) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const pos = calcButtonPosition(rect, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      floatButton.show(pos.x, pos.y);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    // M2 T2.1/T2.5：选区监听 + 分流逻辑
    createSelectionMonitor({
      onValidSelection: async (selection) => {
        // 采集选区数据（含上下文，T2.6）
        const payload = await collectSelectionPayload(selection, 'float-button');

        // 发送给 background，根据 panelOpen 状态分流
        const response = await sendSelection(payload);

        if (response.delivered) {
          // 侧边栏已打开：已直接投递到素材卡片，不显示浮动按钮（D16 零点击）
          floatButton.hide();
        } else if (response.showFloatButton) {
          // 侧边栏未打开：显示浮动按钮，定位到选区右下角
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const pos = calcButtonPosition(rect, {
            width: window.innerWidth,
            height: window.innerHeight,
          });
          floatButton.show(pos.x, pos.y);
        }
      },
      onInvalidSelection: () => {
        // 无效选区（空选区/输入框内/可编辑元素内）：隐藏浮动按钮
        floatButton.hide();
      },
    });
  },
});
