# M2 · 划词集成 — Plan

> 分支：`20260915-m2-selection-integration` · 依据：[roadmap.md §4](../../roadmap.md)（M2）、[mission.md](../../mission.md)、[techniqueStack.md](../../techniqueStack.md)
> 任务组与 roadmap T2.1–T2.7 **严格按顺序一一对应**；每组完成即在本文勾选，并同步回勾 roadmap.md。
> 测试强制：每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成（roadmap §1 DoD）。

## 1. content script 基础：选区监听与有效性判定（对应 T2.1）

**目标**：content script 上线，selectionchange 去抖监听可用，选区有效性判定纯函数覆盖边界用例。

- [ ] 1.1 WXT content script 入口 `entrypoints/content.ts`：`document_idle` 注入，`<all_urls>` 匹配；初始化选区监听模块
- [ ] 1.2 `core/selection/validator.ts`：选区有效性判定纯函数 `isValidSelection(selection: Selection | null): boolean`——空选区/输入框内/可编辑元素内/select 内/纯空白 → false；普通段落 → true
- [ ] 1.3 `entrypoints/content/selection/monitor.ts`：`selectionchange` 事件监听 + 200ms 去抖（`setTimeout` + `clearTimeout`）；有效选区时触发回调，无效时隐藏浮动按钮
- [ ] 1.4 页面滚动/窗口大小变化时重新定位浮动按钮（`scroll` 捕获阶段 + `resize`）
- [ ] 1.5 页面卸载/隐藏时清理（`visibilitychange` + `beforeunload`：移除浮动按钮、清除定时器）
- [ ] 1.6 **L1 单测**：`validator.test.ts`（8 例：空选区/null/普通段落/输入框内/textarea 内/contenteditable 内/select 内/纯空白选区）
- [ ] 1.7 **L2 单测**：content script 选区监听行为（4 例：selectionchange 触发去抖回调/无效选区不触发/200ms 内连续触发只执行一次/页面卸载清理），使用 `vi.stubGlobal` + fakeBrowser

**完成判据**：在普通网页划词后 200ms 触发回调；在输入框内划词不触发；三门禁全绿。

## 2. 浮动按钮：Shadow DOM + 定位 + 点击发送（对应 T2.2, D16）

**目标**：浮动按钮仅在侧边栏未打开时显示（D16 分流），选区右下角定位，Shadow DOM 隔离站点样式，防溢出，点击后通知 background 打开侧边栏并转发暂存的选区。

- [ ] 2.1 `entrypoints/content/float-button/style.ts`：内联 CSS 字符串（按钮 32×32 圆形、深色半透明背景、hover 变亮、tooltip、z-index 最大值）；不引用外部样式表
- [ ] 2.2 `entrypoints/content/float-button/index.ts`：`createFloatButton()` → 创建 `div` → `attachShadow({ mode: 'open' })` → 注入 `<style>` + 按钮元素 → 挂载到 `document.body`；`show(x, y)` / `hide()` / `destroy()` 方法
- [ ] 2.3 `entrypoints/content/float-button/position.ts`：定位纯函数 `calcButtonPosition(rect: DOMRect, viewport: { width: number; height: number }, buttonSize: number): { x: number; y: number }`——选区右下角 +8px 偏移；右溢出则左移，下溢出则上移到选区上方
- [ ] 2.4 图标：内联 SVG（Atmate 图标，复用 M0 图标的 path 或简化版）；不使用外部图片
- [ ] 2.5 **分流逻辑**（D16）：`entrypoints/content/messaging/send.ts`——选区有效后 `chrome.runtime.sendMessage({ type: 'AT_SELECTION_SEND', payload })` → 等待 background 回复：`{ delivered: true }` → 不显示浮动按钮；`{ delivered: false, showFloatButton: true }` → 显示浮动按钮
- [ ] 2.6 点击事件：按钮 `click` → 隐藏按钮 → `chrome.runtime.sendMessage({ type: 'AT_FLOAT_BUTTON_CLICK' })` → background 打开侧边栏并转发暂存的 payload（无需重新发送选区数据）
- [ ] 2.7 Shadow DOM 降级：若 `attachShadow` 抛错（极罕见 CSP），降级为直接创建 div + 内联 style 属性，不崩溃
- [ ] 2.8 **L1 单测**：`position.test.ts`（6 例：正常右下角/右溢出左移/下溢出上移/同时溢出/选区在视口左上角/选区在视口右下角）
- [ ] 2.9 **L2 单测**：浮动按钮创建与点击（5 例：Shadow DOM 创建成功/show 定位正确/hide 隐藏/点击发送 AT_FLOAT_BUTTON_CLICK/attachShadow 失败降级）
- [ ] 2.10 **L2 单测**：分流响应处理（3 例：delivered=true 不显示按钮/showFloatButton=true 显示按钮/响应超时降级为显示按钮）

**完成判据**：侧边栏未打开时，划词后右下角出现图标按钮；hover 显示 tooltip；点击后侧边栏打开并填入素材；侧边栏已打开时，划词不显示浮动按钮（素材直接填入侧边栏，需配合任务组 5）；按钮不受站点样式影响；三门禁全绿。

## 3. 右键菜单（对应 T2.3）

**目标**：background 注册右键菜单项，选中文字后右键可见，点击后走与浮动按钮相同的消息链路。

- [ ] 3.1 `entrypoints/background/context-menus.ts`：`chrome.contextMenus.create({ id: 'at-send-selection', title: '发送选中内容到在伴 AI 侧边栏', contexts: ['selection'] })`；在 `defineBackground` 的 `main()` 中调用
- [ ] 3.2 `chrome.contextMenus.onClicked` 监听：判断 `menuItemId === 'at-send-selection'` → 取 `info.selectionText` + `tab.title` + `tab.url` → 构造消息 `{ type: 'AT_SELECTION_SEND', payload: { text: info.selectionText, title, url, source: 'context-menu' } }` → 走消息路由（T2.5 的 `sendToSidepanel`）
- [ ] 3.3 selectionText 为空时忽略（不发送、不打开面板）
- [ ] 3.4 manifest 新增 `contextMenus` 权限（D14）；`CHROMEWEBSTORE.md` 同步记录权限理由
- [ ] 3.5 **L2 单测**：右键菜单（4 例：菜单创建正确/点击 selection 上下文发送消息/selectionText 为空不发送/点击其他菜单项不触发），使用 `vi.stubGlobal` + fakeBrowser 的 `contextMenus`

**完成判据**：选中文字后右键菜单中出现"发送选中内容到在伴 AI 侧边栏"；点击后侧边栏打开并接收素材；manifest permissions 含 `contextMenus`；三门禁全绿。

## 4. 面板接收：素材卡片 UI（对应 T2.4）

**目标**：sidepanel 接收选区消息后展示素材卡片，支持编辑/补充/上下文档位/采用/丢弃，落点定案（默认当前会话·一键转新·无激活即新建）。

- [ ] 4.1 `components/chat/MaterialCard.tsx`：单张素材卡片组件——来源角标（图标 + 网页标题，hover 显示完整 URL）、原文编辑 textarea、补充说明 input、上下文档位 segmented control、上下文预览折叠区、token 预览、落点提示 + 转新会话按钮、采用/丢弃按钮
- [ ] 4.2 `components/chat/MaterialCardList.tsx`：卡片列表容器（Composer 上方），支持多卡片积累，按 createdAt 排序，从下往上滑入动画
- [ ] 4.3 `core/material/types.ts`：`MaterialCard` 接口定义（见 requirements §4.1）
- [ ] 4.4 `core/material/promptBuilder.ts`：prompt 组装纯函数 `buildMaterialPrompt(card: MaterialCard): string`——按 requirements §4.5 格式组装【用户选中的内容】【附带的上下文·前/后段落】【用户补充说明】；空区块省略；selection 档/nearby 档/page 档分别处理
- [ ] 4.5 `ChatView.tsx` 集成：监听 `chrome.runtime.onMessage`，收到 `AT_SELECTION_DELIVER`（background 分流后的最终投递，D16）→ 创建 `MaterialCard`（contextScope 默认取 `uiPrefs.defaultContextScope`，即 `'nearby'`）→ 加入卡片列表
- [ ] 4.6 采用行为：点击"采用"→ `buildMaterialPrompt(card)` → 追加到 Composer 输入框末尾（空行分隔）→ 从卡片列表移除；若 Composer 为空则直接设置值
- [ ] 4.7 丢弃行为：点击"丢弃"→ 从卡片列表移除，不填入 Composer
- [ ] 4.8 落点逻辑（D7）：卡片顶部常显"将发送至：<当前会话名>"；"转新会话"按钮切换为"将发送至：新会话"；采用时若为新会话则先创建新会话（默认角色「在伴 Atmate」）再填入；无激活会话时直接显示"新会话"
- [ ] 4.9 Composer 接口扩展：M1 的 `Composer.tsx` 需支持外部设置/追加值（通过 props 回调或 ref 暴露 `appendText` / `setText`）
- [ ] 4.10 token 预览：卡片上显示 `≈${estimateTokens(buildMaterialPrompt(card))} token`，切换档位/编辑原文时实时更新
- [ ] 4.11 **L1 单测**：`promptBuilder.test.ts`（10 例：selection 档/nearby 档完整/nearby 缺前段落/nearby 缺后段落/page 档/补充说明为空省略/补充说明非空/多标记文字计入/原文含特殊字符/空卡片）
- [ ] 4.12 **L1 单测**：`material types + 纯函数`（如需要）
- [ ] 4.13 **L2 单测**：`ChatView` 消息监听（3 例：收到 AT_SELECTION_SEND 创建卡片/收到其他类型消息忽略/卡片采用后追加到 Composer）—— 若组件测试环境未就绪，用逻辑层测试替代

**完成判据**：划词发送后侧边栏出现素材卡片；编辑原文/补充说明后采用，Composer 中内容正确；切换上下文档位后预览和 token 更新；转新会话后采用创建新会话；丢弃后卡片消失；三门禁全绿。

## 5. 消息链路容错与分流（对应 T2.5, D16）

**目标**：background 维护侧边栏打开状态（port 连接检测），划词消息根据状态分流（已打开→直接投递 / 未打开→显示浮动按钮）；冷启动竞态、同 Tab 重复发送、超长选区三种容错场景处理正确。

- [ ] 5.1 `entrypoints/background/panel-state.ts`：`panelOpen: boolean` 状态维护；`chrome.runtime.onConnect` 监听 `port.name === 'at-sidepanel'` → `panelOpen = true`；`port.onDisconnect` → `panelOpen = false`；导出 `isPanelOpen()`
- [ ] 5.2 sidepanel 入口 `entrypoints/sidepanel.ts` `main()` 中新增：`chrome.runtime.connect({ name: 'at-sidepanel' })`（建立 long-lived port，D16 状态检测）；初始化完成后 `chrome.runtime.sendMessage({ type: 'AT_PANEL_READY' })`（冷启动就绪通知）
- [ ] 5.3 `entrypoints/background/pending-material.ts`：`pendingMaterial: SelectionSendPayload | null` 内存变量；`setPending(payload)` / `getPendingAndClear()` / `hasPending()`；连续划词覆盖旧暂存
- [ ] 5.4 `entrypoints/background/messaging-router.ts`：消息分流函数 `routeSelectionMessage(payload, sendResponse)`（D16 核心）：
  - 若 `isPanelOpen() === true` → `chrome.runtime.sendMessage({ type: 'AT_SELECTION_DELIVER', payload })` → `sendResponse({ delivered: true })`
  - 若 `isPanelOpen() === false` → `setPending(payload)` → `sendResponse({ delivered: false, showFloatButton: true })`
- [ ] 5.5 `AT_FLOAT_BUTTON_CLICK` 处理：收到浮动按钮点击消息 → `chrome.sidePanel.open({ windowId })`（打开当前窗口侧边栏）→ 暂存的 payload 已在 pending-material 中 → 等 `AT_PANEL_READY` 后转发
- [ ] 5.6 `AT_PANEL_READY` 处理：收到 sidepanel 就绪通知 → 若 `hasPending()` → `chrome.runtime.sendMessage({ type: 'AT_SELECTION_DELIVER', payload: getPendingAndClear() })`；若无暂存 → 忽略
- [ ] 5.7 background `onMessage` 监听整合：`AT_SELECTION_SEND`（来自 content / 右键菜单）→ `routeSelectionMessage`（注意：`sendResponse` 需返回 `true` 保持异步通道开放）；`AT_FLOAT_BUTTON_CLICK` → 打开侧边栏；`AT_PANEL_READY` → 转发暂存
- [ ] 5.8 同 Tab 重复发送：侧边栏已打开时，每次划词直接创建新卡片（多卡片积累，D3）；侧边栏未打开时，连续划词覆盖暂存（以最新选区为准），浮动按钮重新定位
- [ ] 5.9 超长选区：不截断（D6）；token 估算超 contextLimit 时，卡片 token 预览显示红色 + 采用后 TokenStatusBar 红条禁发；卡片上不显示截断提示
- [ ] 5.10 **L2 单测**：panelOpen 状态（4 例：port 连接置 true/port 断开置 false/初始 false/多 port 连接最后一个断开置 false）
- [ ] 5.11 **L2 单测**：消息分流（6 例：panelOpen=true 直接转发 AT_SELECTION_DELIVER + 回复 delivered/panelOpen=false 暂存 + 回复 showFloatButton/AT_FLOAT_BUTTON_CLICK 触发 sidePanel.open/AT_PANEL_READY 有暂存则转发/AT_PANEL_READY 无暂存忽略/连续划词覆盖暂存）
- [ ] 5.12 **L2 单测**：冷启动竞态（3 例：面板未就绪时暂存/面板就绪后直接转发/AT_PANEL_READY 后转发暂存并清空）—— 与 5.11 部分重叠，可合并

**完成判据**：侧边栏已打开时划词，素材卡片直接出现（零点击）；侧边栏未打开时划词，显示浮动按钮，点击后打开侧边栏并填入；连续划词覆盖暂存；超长选区不截断但超限时禁发；三门禁全绿。

## 6. 上下文供给·网页侧（对应 T2.6）

**目标**：三档上下文采集（仅选区 / ±相邻段落 / 附整页正文）可用，默认 ±相邻段落，readability 失败降级标注，素材卡片分栏预览，token 预览联动。

- [ ] 6.1 `entrypoints/content/selection/context.ts`：`getContextData(range: Range, scope: 'selection' | 'nearby' | 'page'): Promise<ContextData>`——按档位采集
- [ ] 6.2 `core/selection/nearby.ts`：±相邻段落采集纯函数 `getNearbyParagraphs(range: Range): { before?: string; after?: string }`（D13 算法：起点所在块级元素 → previousElementSibling 跳过空 → nextElementSibling 跳过空）
- [ ] 6.3 `entrypoints/content/selection/readability.ts`：整页正文提取——动态 import `@mozilla/readability`；`new Readability(document.cloneNode(true)).parse()`；HTML 转纯文本；失败判定（null/空/比选区短）→ `readabilityFailed = true`
- [ ] 6.4 `pnpm add @mozilla/readability`（生产依赖）；类型声明（`@types/mozilla-readability` 或自写 `.d.ts`）
- [ ] 6.5 content script 发送消息时携带 `contextData`：T2.2 的 2.5 点击事件中，根据当前默认档位（`uiPrefs.defaultContextScope`，需从 storage 读取或通过消息查询）采集上下文后一并发送
- [ ] 6.6 uiPrefs 新增 `defaultContextScope` 字段（默认 `'nearby'`）：storage schema 兼容（旧数据无此字段时默认 `'nearby'`）；设置·偏好页可切换（可选，若 UI 空间有限可先只存默认值不暴露设置）
- [ ] 6.7 素材卡片上下文档位切换：切换后重新采集上下文（nearby→page 时需 content script 重新提取，通过 `chrome.tabs.sendMessage` 向当前 tab 的 content script 请求）；切换为 selection 时直接用已有 selection 文本
- [ ] 6.8 readability 失败降级：卡片上显示红色警告"整页提取失败，已降级为仅选区"；实际发送内容为仅选区；`contextData.readabilityFailed = true`
- [ ] 6.9 上下文预览：卡片折叠区展示 `buildMaterialPrompt(card)` 的完整内容（含【用户选中的内容】等标记），用户可确认将发送的内容
- [ ] 6.10 token 预览联动：切换档位/编辑原文时，`estimateTokens(buildMaterialPrompt(card))` 实时更新
- [ ] 6.11 **L1 单测**：`nearby.test.ts`（8 例：正常前后段落/只有前段落/只有后段落/无相邻段落/选区跨多块/起点在 body 直接子节点/空段落跳过/嵌套 div 中的 p）
- [ ] 6.12 **L1 单测**：`promptBuilder` 已在 T2.4 的 4.11 覆盖（含三档格式）
- [ ] 6.13 **L2 单测**：readability 提取（4 例：正常提取返回正文/提取失败返回 null 标记/提取内容比选区短标记失败/动态 import 成功）

**完成判据**：默认档位 ±相邻段落，卡片中可见前/后段落；切换为整页正文时 readability 提取成功；提取失败时降级标注；切换档位后 token 预览更新；三门禁全绿。

## 7. spec 归档（对应 T2.7）

**目标**：本目录三件套更新为已实现版，roadmap 回勾，变更记录追加。

- [ ] 7.1 本目录 requirements/plan/validation 三件套更新为"已实现"状态（勾选完成项、记录实际结果、记录验收中发现的偏差与修复）
- [ ] 7.2 roadmap.md T2.1–T2.6 全部回勾为 `[x]`，T2.7 勾选
- [ ] 7.3 roadmap.md §10 追加一行 M2 变更记录
- [ ] 7.4 `CHROMEWEBSTORE.md` 确认 `contextMenus` 权限说明已更新
- [ ] 7.5 确认 manifest permissions 为 `["sidePanel", "storage", "contextMenus"]`，无意外新增
- [ ] 7.6 确认 `passWithNoTests` 保持关闭

**完成判据**：roadmap M2 全部勾选，变更记录已追加，spec 目录状态为已实现；三门禁全绿。

---

## 执行顺序说明

严格按 1→2→3→4→5→6→7 编号勾选。实际开发流建议如下（任务编号不变，仅执行顺序微调）：

1. **任务 1**（content script 基础）：选区监听 + 有效性判定，是所有后续任务的前置
2. **任务 5 骨架**（panel-state + messaging-router 基础）：先搭好 `panelOpen` 状态维护和消息分流骨架，这样任务 2/3 可以直接对接分流逻辑
3. **任务 2**（浮动按钮）：依赖任务 1（选区回调）和任务 5 骨架（分流响应）
4. **任务 3**（右键菜单）：依赖任务 5 骨架（分流逻辑），可与任务 2 并行
5. **任务 4**（素材卡片）：依赖任务 5（`AT_SELECTION_DELIVER` 投递），sidepanel 侧 UI
6. **任务 6**（上下文供给）：依赖任务 1（content script）和任务 4（卡片预览），可在任务 4 基本可用后并行
7. **任务 5 补全**（容错 + 单测）：在 2/3/4/6 都对接后，补全冷启动竞态、重复发送等容错场景和完整 L2 测试
8. **任务 7**（归档）：全部完成后执行

**关键依赖链**：
- 任务 5 的 `panelOpen` 状态（port 连接检测）是任务 2/3 分流的前提
- 任务 5 的 `AT_SELECTION_DELIVER` 投递是任务 4 素材卡片的触发源
- 任务 2/3 共享任务 5 的分流逻辑，区别仅在于消息来源（`source: 'float-button' | 'context-menu' | 'auto-fill'`）
- 任务 6 的上下文采集在 content script 侧，采集后随 `AT_SELECTION_SEND` 一并传给 background
