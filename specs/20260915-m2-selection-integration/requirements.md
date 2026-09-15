# M2 · 划词集成 — Requirements

> 评审定案（2026-09-15，AskUserQuestion）：浮动按钮=选区右下角图标按钮；素材卡片=暂存+显式采用/丢弃；上下文供给默认=±相邻段落且 prompt 中标示选区与附带上下文分界；超长选区=不截断仅 token 预警。
> 依据：[mission.md](../../mission.md)、[roadmap.md §4](../../roadmap.md)、[techniqueStack.md](../../techniqueStack.md)

## 1. 背景（Why）

M1 已交付完整的侧边栏对话体验（API 配置、角色、流式输出、token 状态条、会话管理、持久化），但素材只能靠**手动粘贴/输入**——产品的灵魂链路"在网页上划词 → 一键发送到侧边栏"尚未打通。

M2 的目标是上线 **content script**，把划词链路从 0 到 1 跑通：用户在任意网页选中文字 → 浮动按钮或右键菜单 → 侧边栏打开并接收素材卡片 → 编辑/补充 → 采用后发送。同时落地 **上下文供给**（FR-2.5 网页侧）：默认附带选区前后段落，且在 prompt 中明确标示选区与附带上下文的分界，让 AI 区分"用户明确选中的"与"附带的语境"。

此里程碑**不涉及 PDF**（M3）、**不涉及图片**（M4）、**不涉及 usage 精确模式**（M5）。

引用的 FR/NFR：
- FR-2.1（网页划词：获取选中文本及来源）
- FR-2.2（补充输入：发送前编辑选中文本、追加补充说明）
- FR-2.5（上下文范围：仅选区 / ±相邻段落 / 附整页正文，网页侧）
- FR-7.1（浮动按钮：Shadow DOM 隔离，点击→打开侧边栏携带选区）
- FR-7.2（右键菜单："发送选中内容到 AI 侧边栏"）
- FR-7.3 加分项部分（对输入框/密码框等场景自动抑制浮层）
- NFR-1（性能：浮层定位不阻塞、面板打开到可输入 <300ms）
- NFR-2（安全：请求直连用户端点，content script 不收集额外数据）
- NFR-3（兼容性：Chrome ≥114，Shadow DOM 隔离站点样式）
- NFR-4（健壮性：冷启动竞态、重复发送、readability 失败降级）

## 2. 范围（Scope）

### 在范围

| 领域 | 内容 | 对应 T |
|---|---|---|
| content script 基础 | selectionchange 去抖监听；选区有效性判定（可编辑元素/输入框内不弹浮层）；单测 | T2.1 |
| 浮动按钮 | Shadow DOM 隔离；选区右下角定位；防溢出视口；图标按钮；点击→sidePanel.open + runtime.sendMessage | T2.2 |
| 右键菜单 | background 注册 contextMenus（selection 上下文）；点击→sidePanel.open + 消息携带选区 | T2.3 |
| 面板接收·素材卡片 | 来源角标（网页标题+URL）；原文可编辑；补充输入框；采用/丢弃按钮；落点定案（默认当前会话·一键转新·无激活即新建）；卡片顶部常显"将发送至：<会话名>" | T2.4 |
| 消息链路容错 | 面板未开时点击（冷启动竞态：消息暂存+面板就绪后消费）；同 Tab 重复发送（新素材替换旧卡片）；超长选区（不截断，仅 token 预警） | T2.5 |
| 上下文供给·网页侧 | 三档采集：仅选区 / ±相邻段落 / 附整页正文（readability 提取，失败降级标注）；默认 ±相邻段落；prompt 组装中标示选区与附带上下文分界；素材卡片分栏预览；token 预览联动；单测 | T2.6 |
| spec 归档 | 本目录三件套更新为已实现版；roadmap 回勾 | T2.7 |

### 明确不做（本里程碑）

- **PDF 划词与 PDF 查看页** → M3（T3.1–T3.7）
- **图片输入**（右键图片、供给附图、vision 开关、schema v2）→ M4
- **usage 精确模式、压缩历史、reasoning 折叠、导出、快捷键、温度/extraBody** → M5
- **i18n 中英切换** → M6；M2 UI 文案中文硬编码
- **E2E 测试**（Playwright）→ M3 后引入；M2 做 L1/L2 单测，L3 组件测试按需
- **整页翻译、批量抓取页面** → Out of Scope（mission §5）
- **工具层 / Agent 工作流** → Out of Scope（ADR-007）

## 3. 决策（Decisions）

| # | 决策 | 依据 |
|---|---|---|
| D1 | M2 范围严格 = roadmap T2.1–T2.7，不裁剪、不增项 | spec-first 流程；roadmap §4 |
| D2 | **浮动按钮样式**：选区右下角 · 图标按钮（仅 Atmate 图标，hover 显示 tooltip "发送到在伴"）；不使用文字按钮 | 评审 Q1（2026-09-15）：用户选择"选区右下角 · 图标按钮"，最不干扰阅读 |
| D3 | **素材卡片交互**：卡片暂存 · 显式采用/丢弃——素材以卡片形式暂存在输入框上方，用户点"采用"才填入 Composer 输入框，点"丢弃"则清除；支持多轮划词积累多个素材卡片 | 评审 Q2（2026-09-15）：用户选择"卡片暂存 · 显式采用/丢弃"，多轮划词时可积累 |
| D4 | **上下文供给默认档**：±相邻段落（非"仅选区"）；用户可手动切换为仅选区或附整页正文 | 评审 Q3（2026-09-15）：用户明确"要带上相邻段落"，翻译/解读场景需要语境 |
| D5 | **prompt 中标示选区与附带上下文分界**：最终发送的 user message 中，用明确的标记区分「用户选中的内容」与「附带的上下文（前/后段落）」，格式见 §4.5；AI 可据此区分用户明确关注的部分与补充语境 | 评审 Q3（2026-09-15）：用户要求"在 prompt 中标示出选区是什么，带上相邻段落后是什么" |
| D6 | **超长选区不做硬截断**：不设字符上限截断；完全由 TokenStatusBar 的 contextLimit 治理——超限时禁发并提示，用户自行缩减或开新会话 | 评审 Q4（2026-09-15）：用户选择"不截断 · 仅 token 预警" |
| D7 | **素材落点**（roadmap T2.4 定案，2026-09-13）：默认进当前激活会话——卡片顶部常显"将发送至：<会话名>"并支持一键转新会话；无激活会话则直接新建，不弹确认 | roadmap v0.4 变更；T2.4 重写 |
| D8 | **content script 注入范围**：`<all_urls>`（M0 manifest 已声明 host_permissions）；`document_idle` 时机注入；不注入 `chrome://`、`chrome-extension://`、`about:` 等内部页面 | tech §3；WXT content script 配置 |
| D9 | **Shadow DOM 隔离**：浮动按钮挂载在 `document.body` 下的 `open` Shadow Root 中；样式全部内联在 Shadow DOM 内，不依赖站点 CSS 也不污染站点；按钮 z-index 设为 `2147483647`（最大 int） | FR-7.1；NFR-3；常见扩展实践 |
| D10 | **消息传递协议**：content script → background → sidepanel 使用 `chrome.runtime.sendMessage`；消息类型 `AT_SELECTION_SEND`，payload `{ text, title, url, source: 'float-button' | 'context-menu' }`；sidepanel 通过 `chrome.runtime.onMessage` 监听 | tech §6 消息传递；WXT 入口间通信 |
| D11 | **冷启动竞态处理**：用户点击浮动按钮时 sidepanel 可能尚未打开/初始化。方案：background 收到消息后先 `sidePanel.open()`，再将消息暂存到 `pendingMaterial`（内存变量）；sidepanel 初始化完成后向 background 发 `AT_PANEL_READY`，background 将暂存消息转发给 sidepanel 并清空 | T2.5；NFR-4；避免消息丢失 |
| D12 | **整页正文提取**：使用 `@mozilla/readability`（轻量、成熟）；提取失败（返回空或标题为空）时降级为"仅选区"档并在素材卡片上显著标注"整页提取失败，已降级为仅选区" | FR-2.5；tech §8.2；NFR-4 |
| D13 | **±相邻段落采集算法**：以选区所在的块级元素（`<p>`/`<li>`/`<div>`/`<h1-6>` 等）为中心，向前取一个非空兄弟块级元素、向后取一个非空兄弟块级元素；若选区跨越多个块级元素，则以选区起点所在块为中心；空段落/纯空白段落跳过 | T2.6；tech §8.2；纯函数可单测 |
| D14 | **权限新增**：`contextMenus`（右键菜单必需）；manifest permissions 从 `["sidePanel", "storage"]` 变为 `["sidePanel", "storage", "contextMenus"]`；不新增 host_permissions（`<all_urls>` 已在 M0 声明） | tech §3；最小权限原则；FR-7.2 |
| D15 | **测试按 techniqueStack §10 四层金字塔执行**；每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成；T2.1（选区判定纯函数）、T2.6（三档组装纯函数+截断边界+失败降级标注）必须有 L1 单测；content script 行为用 L2（vi.stubGlobal + fakeBrowser） | roadmap §1 DoD（v0.5）；techniqueStack §10 |
| D16 | **侧边栏状态感知分流**：划词后 content script 将选区发送给 background，background 根据侧边栏是否已打开决定行为——① 侧边栏**已打开**：直接转发给 sidepanel 创建素材卡片（零点击，划词即暂存）；② 侧边栏**未打开**：回复 content script 显示浮动按钮，用户点击后才打开侧边栏并填入。background 用 long-lived port（`chrome.runtime.connect`）维护 `panelOpen` 状态，sidepanel 连接时置 true、断开时置 false | 用户反馈（2026-09-15）：已打开对话时直接填入素材卡片即可，不需要浮动按钮；减少已打开用户的操作步骤 |
| D17 | **多窗口边缘情况暂不处理**：`panelOpen` 为全局状态（不区分窗口），若窗口 A 打开了侧边栏、用户在窗口 B 划词，素材会出现在窗口 A 的侧边栏。M2 标注为已知限制，后续可通过 payload 携带 `windowId` + sidepanel 过滤解决 | 实现复杂度权衡；大多数用户单窗口使用；M2 优先保证主路径体验 |

## 4. 上下文与约束（Context & Constraints）

### 4.1 数据模型与存储变更（tech §5）

- **schemaVersion 保持 1**（M4 才升 v2）
- **新增存储键**：无（素材卡片为内存状态，不持久化；关闭侧边栏后未采用的素材丢弃）
- **新增 uiPrefs 字段**：
  ```ts
  interface UiPrefs {
    baseDirectiveEnabled: boolean;   // M1 已有
    defaultContextScope: 'selection' | 'nearby' | 'page';  // 新增，默认 'nearby'（D4）
    locale: 'zh-CN';                  // M1 已有
  }
  ```
- **素材卡片内存模型**（sidepanel React state，不持久化）：
  ```ts
  interface MaterialCard {
    id: string;                  // nanoid
    text: string;                // 原文（可编辑）
    supplement: string;          // 用户补充说明
    source: {
      title: string;             // 网页标题
      url: string;               // 网页 URL
      type: 'float-button' | 'context-menu';
    };
    contextScope: 'selection' | 'nearby' | 'page';  // 当前档位
    contextData: {
      selection: string;         // 纯选区文本（不可编辑，用于 prompt 标记）
      beforeParagraph?: string;  // 前一段落（nearby 档）
      afterParagraph?: string;   // 后一段落（nearby 档）
      fullPage?: string;         // 整页正文（page 档）
      readabilityFailed?: boolean;  // page 档提取失败标记
    };
    adopted: boolean;            // 是否已采用（采用后从卡片列表移除，文本填入 Composer）
    createdAt: number;
  }
  ```
- **消息传递 payload**（D10 / D16）：
  ```ts
  // content script → background（划词后统一发送，background 分流）
  interface SelectionSendMessage {
    type: 'AT_SELECTION_SEND';
    payload: {
      text: string;
      title: string;
      url: string;
      source: 'float-button' | 'context-menu' | 'auto-fill';
      // context 数据由 content script 采集后一并传入（T2.6）
      contextData?: {
        selection: string;
        beforeParagraph?: string;
        afterParagraph?: string;
        fullPage?: string;
        readabilityFailed?: boolean;
      };
    };
  }
  // background → content script（回复：是否已直接投递，还是显示浮动按钮）
  interface SelectionSendResponse {
    delivered: boolean;       // true: 已直接转发给 sidepanel；false: 未投递
    showFloatButton?: boolean; // true: content script 显示浮动按钮
  }
  // content script → background（浮动按钮被点击，background 取出暂存的 payload）
  interface FloatButtonClickMessage {
    type: 'AT_FLOAT_BUTTON_CLICK';
  }
  // background → sidepanel（最终投递，创建素材卡片）
  interface SelectionDeliverMessage {
    type: 'AT_SELECTION_DELIVER';
    payload: SelectionSendMessage['payload'];
  }
  // sidepanel → background（初始化完成，冷启动时触发暂存消息转发）
  interface PanelReadyMessage {
    type: 'AT_PANEL_READY';
  }
  ```
- **sidepanel 状态检测**（D16）：sidepanel 入口 `main()` 中 `chrome.runtime.connect({ name: 'at-sidepanel' })` 建立 long-lived port；background `onConnect` 监听 `port.name === 'at-sidepanel'` → `panelOpen = true`；`port.onDisconnect` → `panelOpen = false`。无需轮询，状态实时。

### 4.2 content script 架构（T2.1–T2.3, T2.6, D16）

```
entrypoints/content.ts（WXT content script 入口）
├── selection/
│   ├── monitor.ts        # selectionchange 监听 + 去抖（200ms）
│   ├── validator.ts      # 选区有效性判定纯函数（L1 单测）
│   └── context.ts        # 上下文采集：±相邻段落 / 整页正文（readability）
├── float-button/
│   ├── index.ts          # Shadow DOM 创建 + 挂载（仅 panelOpen=false 时显示，D16）
│   ├── position.ts       # 选区右下角定位 + 防溢出纯函数（L1 单测）
│   └── style.ts          # 内联 CSS 字符串
└── messaging/
    └── send.ts           # runtime.sendMessage 封装 + 响应处理（D16 分流）
```

- **selectionchange 去抖**：200ms（用户停止选择后 200ms 才触发后续流程，避免拖动过程中频繁闪烁）
- **选区有效性判定**（`validator.ts`，纯函数）：
  - 空选区（`selection.rangeCount === 0` 或 `toString() === ''`）→ 不处理
  - 选区在 `<input>` / `<textarea>` / `[contenteditable="true"]` 内 → 不处理（FR-7.3 加分项）
  - 选区在 `<select>` 内 → 不处理
  - 选区纯空白（trim 后为空）→ 不处理
  - 其余 → 进入分流流程
- **分流流程**（D16，核心）：
  1. 选区有效 → 采集上下文数据（默认 nearby 档，T2.6）
  2. `chrome.runtime.sendMessage({ type: 'AT_SELECTION_SEND', payload })` → background
  3. 等待 background 回复：
     - `{ delivered: true }` → 侧边栏已打开，已直接投递 → **不显示浮动按钮**（可选：显示短暂 toast 反馈"已填入在伴侧边栏"，M2 先不做）
     - `{ delivered: false, showFloatButton: true }` → 侧边栏未打开 → **显示浮动按钮**
  4. 浮动按钮点击 → `chrome.runtime.sendMessage({ type: 'AT_FLOAT_BUTTON_CLICK' })` → background 打开侧边栏并转发暂存的 payload → 隐藏浮动按钮
- **浮动按钮定位**（`position.ts`，纯函数）：
  - 取选区 `Range.getBoundingClientRect()` 的右下角坐标 `(right, bottom)`
  - 按钮尺寸 32×32px，偏移 right+8, bottom+8
  - 防溢出：若 right+8+32 > window.innerWidth，则左移到 innerWidth-32-8；若 bottom+8+32 > window.innerHeight，则上移到 bottom-32-8（显示在选区上方）
  - 页面滚动时重新定位（监听 `scroll` 事件，捕获阶段）
- **图标**：使用内联 SVG（Atmate 图标，M0 已生成的图标可复用为 base64 或直接 SVG path）

### 4.3 background 架构（T2.3, T2.5, D16）

```
entrypoints/background.ts（WXT background 入口，M0 已有 sidePanel.open 逻辑）
├── context-menus.ts        # 右键菜单创建与点击处理
├── panel-state.ts           # panelOpen 状态维护（port 连接检测，D16）
├── pending-material.ts      # 冷启动暂存（D11）+ 浮动按钮暂存（D16）
└── messaging-router.ts      # 消息路由：content → 分流（直接投递 / 显示浮动按钮）→ sidepanel
```

- **panelOpen 状态**（D16）：
  - `panelOpen: boolean`，初始 false
  - sidepanel `main()` 中 `chrome.runtime.connect({ name: 'at-sidepanel' })`
  - background `chrome.runtime.onConnect`：`port.name === 'at-sidepanel'` → `panelOpen = true`
  - `port.onDisconnect` → `panelOpen = false`
  - 多窗口不区分（D17 已知限制）

- **消息分流逻辑**（D16，核心）：
  - 收到 `AT_SELECTION_SEND`（来自 content script 或右键菜单）：
    1. 若 `panelOpen === true` → 直接 `chrome.runtime.sendMessage({ type: 'AT_SELECTION_DELIVER', payload })` 广播给 sidepanel → 回复 content script `{ delivered: true }` → content script 不显示浮动按钮
    2. 若 `panelOpen === false` → `setPending(payload)` 暂存 → 回复 content script `{ delivered: false, showFloatButton: true }` → content script 显示浮动按钮
  - 收到 `AT_FLOAT_BUTTON_CLICK`（来自 content script，用户点击浮动按钮）：
    1. `sidePanel.open({ windowId })`（打开当前窗口的侧边栏）
    2. 暂存的 payload 已在 `pending-material` 中
    3. sidepanel 打开后发送 `AT_PANEL_READY` → background 转发暂存的 `AT_SELECTION_DELIVER` → 清空暂存
  - 收到 `AT_PANEL_READY`（来自 sidepanel，初始化完成）：
    - 若 `hasPending()` → 转发 `AT_SELECTION_DELIVER` → 清空暂存
    - 若无暂存 → 忽略

- **右键菜单**：
  - `chrome.contextMenus.create({ id: 'at-send-selection', title: '发送选中内容到在伴 AI 侧边栏', contexts: ['selection'] })`
  - `onClicked` 回调中取 `info.selectionText` + `tab.title` + `tab.url`，构造 `AT_SELECTION_SEND` 消息（`source: 'context-menu'`），走与 content script 相同的分流逻辑
  - selectionText 为空时忽略（不发送、不打开面板）

- **冷启动暂存**（D11，与 D16 整合）：
  - `pendingMaterial: SelectionSendPayload | null`（内存变量）
  - 侧边栏未打开时，划词消息暂存于此；浮动按钮点击后 `sidePanel.open()`，等 `AT_PANEL_READY` 后转发
  - 连续划词（未点击按钮）时，新暂存覆盖旧暂存（以最新选区为准）

### 4.4 sidepanel 素材卡片 UI（T2.4）

```
components/chat/
├── MaterialCardList.tsx   # 卡片列表容器（Composer 上方）
├── MaterialCard.tsx       # 单张素材卡片
│   ├── 来源角标：图标 + 网页标题（hover 显示完整 URL）
│   ├── 原文编辑区：textarea（可编辑，初始为选区文本）
│   ├── 补充输入框：input（"补充说明，如：术语按 XX 领域"）
│   ├── 上下文档位切换：segmented control（仅选区 / ±段落 / 整页）
│   ├── 上下文预览：可折叠区域，展示当前档位将发送的内容（含选区标记）
│   ├── token 预览："≈xxx token"（联动 TokenStatusBar 估算）
│   ├── 落点提示："将发送至：<会话名>" + "转新会话"按钮
│   └── 操作：采用 / 丢弃
└── ChatView.tsx           # 集成：监听 AT_SELECTION_DELIVER（background 分流后最终投递）→ 创建 MaterialCard
```

- **采用行为**：点击"采用"后，将卡片的最终文本（原文+补充说明+上下文组装）填入 Composer 输入框，卡片从列表移除；若有多张卡片，依次采用（每张填入后追加到 Composer，用空行分隔）
- **丢弃行为**：点击"丢弃"后，卡片从列表移除，不填入 Composer
- **多卡片积累**：连续划词发送时，新卡片追加到列表底部；卡片按 `createdAt` 排序
- **落点提示**（D7）：卡片顶部常显"将发送至：<当前会话名>"；点击"转新会话"按钮后，变为"将发送至：新会话"；采用时若为"新会话"则先创建新会话（使用默认角色「在伴 Atmate」）再填入
- **无激活会话**：若当前没有任何会话，落点直接显示"将发送至：新会话"，采用时自动创建

### 4.5 上下文供给与 prompt 组装（T2.6, D5）

**三档定义**：

| 档位 | 采集内容 | 适用场景 |
|---|---|---|
| `selection`（仅选区） | 仅用户选中的文字 | 精确翻译、短文本处理 |
| `nearby`（±相邻段落，**默认**） | 选区 + 前一段落 + 后一段落 | 翻译、解读（需要语境） |
| `page`（附整页正文） | 选区 + readability 提取的整页正文 | 长文研读、需要全文语境 |

**prompt 组装格式**（D5，核心决策）：

最终填入 Composer 的 user message 格式如下（采用时组装）：

```
【用户选中的内容】
{selectionText}

【附带的上下文·前一段落】
{beforeParagraph}

【附带的上下文·后一段落】
{afterParagraph}

【用户补充说明】
{supplement}
```

- `selection` 档：只有【用户选中的内容】和【用户补充说明】（若有）
- `nearby` 档：完整格式（前/后段落缺失时省略对应区块）
- `page` 档：【用户选中的内容】+【附带的上下文·整页正文】+【用户补充说明】
- `readabilityFailed` 时：自动降级为 `selection` 档，卡片上显示红色警告"整页提取失败，已降级为仅选区"
- 标记文字（【用户选中的内容】等）本身也计入 token 估算
- 补充说明为空时省略【用户补充说明】区块

**±相邻段落采集算法**（D13，纯函数 `getNearbyParagraphs(range)`）：
1. 取选区起点所在的块级元素（`closest('p, li, div, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th')`）
2. 向前遍历 `previousElementSibling`，跳过空/纯空白元素，取第一个非空块级元素的 `innerText`
3. 向后遍历 `nextElementSibling`，同上
4. 若起点本身不在块级元素内（如直接在 body 下的文本节点），则 before/after 为 undefined
5. 选区文本本身取 `range.toString()`（与 `contextData.selection` 一致）

**整页正文提取**（D12）：
- 动态 import `@mozilla/readability`（避免 content script 体积过大，按需加载）
- `new Readability(document.cloneNode(true)).parse()` → `{ title, content }`
- 提取的 `content` 为 HTML，转为纯文本（`innerText` 或 strip HTML）
- 失败判定：返回 null、或 content 为空、或 content 长度 < selection 长度
- 失败时 `readabilityFailed = true`，降级

### 4.6 边界与异常

| 场景 | 处理 |
|---|---|
| 面板未打开时点击浮动按钮/右键菜单 | 冷启动暂存（D11）：sidePanel.open + 暂存消息，面板就绪后转发 |
| 同 Tab 连续划词发送 | 新素材创建新卡片追加到列表，不替换旧卡片（D3 多卡片积累） |
| 跨 Tab 划词发送 | 每张卡片携带来源 URL，可区分；均进入当前激活会话 |
| 选区在输入框/可编辑元素内 | 不显示浮动按钮（T2.1 validator）；右键菜单仍可能出现（Chrome 原生行为，点击后 selectionText 为空则忽略） |
| 选区为空或纯空白 | 不显示浮动按钮；右键菜单点击后 selectionText 为空则不发送 |
| 超长选区 | 不截断（D6）；token 估算超 contextLimit 时 TokenStatusBar 红条禁发 |
| readability 提取失败 | 降级为仅选区，卡片显著标注（D12） |
| Shadow DOM 被站点 CSP 阻止 | 极罕见；若 `attachShadow` 抛错，降级为直接创建 div（样式内联），不崩溃 |
| 页面卸载时选区监听 | `visibilitychange` / `beforeunload` 时移除浮动按钮，避免内存泄漏 |
| 选区跨 iframe | 本里程碑不处理跨 iframe 选区（content script 注入到每个 frame 但选区范围限于当前 frame）；标注为已知限制 |
| sidepanel 已打开但非当前标签页 | `sidePanel.open()` 会前置面板；消息通过 runtime.sendMessage 送达 |
| 侧边栏已打开时划词（D16） | background 直接转发 `AT_SELECTION_DELIVER`，sidepanel 创建素材卡片；content script 不显示浮动按钮；用户若只是想复制文本，可丢弃素材卡片 |
| 侧边栏未打开时划词（D16） | background 暂存 payload + 回复显示浮动按钮；用户点击浮动按钮 → `sidePanel.open()` + 等 `AT_PANEL_READY` → 转发暂存 |
| 划词后未点击浮动按钮，重新划词 | 新暂存覆盖旧暂存（以最新选区为准）；浮动按钮重新定位到新选区 |
| 浮动按钮显示后用户点击页面其他地方 | 浮动按钮保持显示（不自动消失）；用户可手动点击页面空白处取消选区后按钮消失（selectionchange 触发空选区判定） |
| sidepanel port 断开但 panelOpen 状态未及时更新 | 极端情况：sidepanel 崩溃导致 port 断开但 onDisconnect 未触发。M2 不做心跳检测，依赖 Chrome 的 port 机制可靠性；若出现状态不一致，用户重新打开侧边栏即可修正 |
| 多窗口划词（D17） | panelOpen 为全局状态，窗口 A 打开侧边栏时，窗口 B 划词会直接投递到窗口 A 的侧边栏。M2 已知限制，后续通过 windowId 过滤解决 |
| 采用时 Composer 已有文本 | 追加到末尾，用空行分隔；不覆盖已有文本 |

### 4.7 性能约束（NFR-1）

- selectionchange 去抖 200ms，避免拖动过程中频繁计算
- 浮动按钮定位使用 `getBoundingClientRect`（同步、快速），不使用 `offsetTop` 等触发重排的属性
- Shadow DOM 内样式极简（按钮只有一个图标），不做复杂动画
- 整页正文提取（readability）在用户切换到 `page` 档时才执行（懒加载），不在划词时执行
- 面板打开到可输入 < 300ms（M1 已保证，M2 不增加阻塞操作）
- content script 注入体积控制：核心逻辑 < 20KB（gzip），readability 动态 import

### 4.8 安全与隐私约束（NFR-2）

- content script 仅在用户主动划词时读取选区文本，不做全页文本扫描（`page` 档仅在用户主动切换时提取）
- 选区文本仅通过 `runtime.sendMessage` 发送给扩展自身的 background/sidepanel，不发送给任何第三方
- 来源 URL 仅用于素材卡片展示，不用于追踪
- 不收集用户浏览历史、不注入广告、不修改页面内容（除浮动按钮外）
- API Key 仍仅存 `chrome.storage.local`，content script 不访问 Key

### 4.9 权限变更（D14）

- manifest permissions：`["sidePanel", "storage", "contextMenus"]`
- `contextMenus` 理由（CHROMEWEBSTORE.md）：提供右键菜单"发送选中内容到在伴 AI 侧边栏"，作为浮动按钮的替代入口
- host_permissions 保持 `<all_urls>`（M0 已声明，content script 注入需要）
- 不新增其他权限

## 5. 交互稿要点

### 5.1 划词分流（D16，核心交互）

用户划词后，系统根据侧边栏状态自动分流：

**场景 A：侧边栏已打开 → 零点击直接填入**
1. 用户在网页上选中一段文字（鼠标松开后 200ms）
2. content script 采集选区 + 上下文（默认 nearby 档）→ 发送给 background
3. background 检测到 `panelOpen === true` → 直接转发给 sidepanel
4. sidepanel 创建素材卡片（从下往上滑入）
5. **不显示浮动按钮**（用户视线在网页上，素材卡片在侧边栏滑入动画提供反馈）
6. 用户切换到侧边栏 → 编辑/补充 → 采用 → 发送

**场景 B：侧边栏未打开 → 浮动按钮 + 一次点击**
1. 用户在网页上选中一段文字（鼠标松开后 200ms）
2. content script 采集选区 + 上下文 → 发送给 background
3. background 检测到 `panelOpen === false` → 暂存 payload → 回复显示浮动按钮
4. 选区右下角出现 32×32 圆形图标按钮（Atmate 图标，深色半透明背景）
5. hover 按钮：显示 tooltip "发送到在伴"，按钮背景变亮
6. 点击按钮：按钮消失（立即反馈）→ background `sidePanel.open()` → 侧边栏打开 → sidepanel 就绪后转发暂存 → 素材卡片出现

### 5.2 右键菜单

1. 用户选中文字后右键
2. 菜单中出现"发送选中内容到在伴 AI 侧边栏"
3. 点击：走与划词相同的分流逻辑（D16）——侧边栏已打开则直接填入，未打开则打开侧边栏并填入
4. 素材卡片来源标记为 `context-menu`

### 5.3 素材卡片

1. 卡片出现在 Composer 输入框上方，从下往上滑入
2. 卡片顶部：来源图标 + 网页标题（hover 显示完整 URL）+ 落点提示"将发送至：<会话名>" + "转新会话"按钮
3. 卡片主体：
   - 原文编辑区（textarea，显示选区文本，可编辑）
   - 补充说明输入框（placeholder "补充说明，如：术语按前端领域"）
   - 上下文档位切换（segmented：仅选区 / ±段落 / 整页，默认 ±段落）
   - 上下文预览（可折叠，展示当前档位将发送的内容，含【用户选中的内容】等标记）
   - token 预览："≈xxx token"
4. 卡片底部：采用按钮（主色）+ 丢弃按钮（次要）
5. 采用：卡片消失，内容填入 Composer 输入框
6. 丢弃：卡片消失，不填入

### 5.4 多卡片场景

- 侧边栏已打开时连续划词：每张卡片自动依次追加，最新的在最下方（零点击积累）
- 侧边栏未打开时连续划词：浮动按钮暂存最新选区（覆盖旧暂存），点击后只创建一张卡片（最新选区）
- 每张卡片独立操作（采用/丢弃）
- 采用顺序：用户可按任意顺序采用；采用的内容依次追加到 Composer

## 6. 与 M1 的接口对接

- **Composer 输入框**：M1 的 `Composer.tsx` 需要暴露 `setValue` / `appendValue` 方法（或通过 props/state 提升），供素材卡片采用时填入文本
- **ChatView**：需要监听 `chrome.runtime.onMessage` 接收 `AT_SELECTION_DELIVER`（background 分流后的最终投递），创建 MaterialCard
- **sidepanel 入口**：M1 的 `entrypoints/sidepanel.ts` `main()` 中需新增 `chrome.runtime.connect({ name: 'at-sidepanel' })`（D16 状态检测）和 `chrome.runtime.sendMessage({ type: 'AT_PANEL_READY' })`（冷启动就绪通知）
- **TokenStatusBar**：素材卡片的 token 预览复用 M1 的 `estimateTokens` 函数
- **会话管理**：采用时若为"转新会话"，复用 M1 的创建会话逻辑（默认角色「在伴 Atmate」）
- **storage**：`uiPrefs.defaultContextScope` 新增字段，M1 的 storage schema 需兼容（旧数据无此字段时默认 `'nearby'`）
