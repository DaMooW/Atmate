export default defineContentScript({
  // 注入声明就位：all_urls · document_idle（tech §3）。
  // M2（T2.1–T2.2）在此之上加 selectionchange 去抖与 Shadow DOM 浮动按钮。
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // M0：空壳。
  },
});
