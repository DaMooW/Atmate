# UI 布局与视觉改版 — Plan

> 分支：`20260915-ui-layout-polish`
> 任务编号：T-UI.1 至 T-UI.11
> 完成判据：每个任务勾选前确认对应改动已完成、相关测试通过、`pnpm test` 全绿。
> 依据：[requirements.md](./requirements.md)、[issues.md](./issues.md)

---

## T-UI.1 会话列表改为抽屉覆盖层

**目标**：修复 L-01——会话列表展开时不再挤压主内容区，改为从左侧滑出的覆盖层抽屉。

**子任务**：

- [x]  1.1 修改 `App.tsx`：会话列表从 flex 并排改为绝对定位覆盖层，新增遮罩层
- [x]  1.2 修改 `SessionList.tsx`：容器改为绝对定位 `left-0 top-0 h-full`，宽度 `w-64`（256px），添加 `transform` 滑入动画
- [x]  1.3 新增遮罩层：`fixed inset-0 bg-black/30`，点击关闭抽屉
- [x]  1.4 添加 Escape 键关闭抽屉（`useEffect` 监听 keydown）
- [x]  1.5 抽屉打开时禁止主内容区滚动
- [x]  1.6 选中会话后自动关闭抽屉
- [x]  1.7 动画参数：`transition-transform duration-200 ease-out`，关闭态 `translate-x-[-100%]`，打开态 `translate-x-0`

**完成判据**：

- 320px 宽度下打开会话列表，对话视图完整可见（被遮罩覆盖但不被挤压）
- 点击遮罩、点击会话项、点击关闭按钮、按 Escape 均可关闭抽屉
- 抽屉滑入动画流畅，无闪烁
- 现有会话列表功能（切换/新建/重命名/删除）全部正常

---

## T-UI.2 角色列表布局修复

**目标**：修复 L-02——角色名称不再竖排，卡片信息层级清晰。

**子任务**：

- [x]  2.1 修改 `RoleList.tsx` 卡片布局：从 `flex items-start justify-between` 改为垂直层级
- [x]  2.2 顶部行：角色名称（`whitespace-nowrap overflow-hidden text-ellipsis flex-1`）+ 默认标签 + 操作按钮区
- [x]  2.3 操作按钮改为图标按钮（复制/编辑/删除），始终可见（不只是 hover）
- [x]  2.4 描述文字：`text-xs text-text-muted`，单行或两行截断
- [x]  2.5 系统提示词预览：`line-clamp-2 text-xs text-text-muted`，与描述之间有间距
- [x]  2.6 卡片样式：`rounded-xl border p-3`，hover 时 `shadow-sm`

**完成判据**：

- 320px 宽度下角色名称单行显示（超长时省略号），不竖排
- "默认"标签不与名称重叠
- 操作按钮可点击、不拥挤
- 卡片信息层级清晰（名称 > 描述 > 提示词预览）

---

## T-UI.3 全局配色与背景统一

**目标**：修复 L-03——左侧导航栏与主内容区颜色协调，无强烈对比。

**子任务**：

- [x]  3.1 排查 `Sidebar.tsx` 颜色渲染异常的根因（是 CSS 层叠、Tailwind 映射、还是扩展页面默认背景）
- [x]  3.2 调整 `style.css` 颜色 token：浅色模式下导航栏 `--surface` 与主内容区 `--bg` 为同色系微差异（如导航栏纯白 #ffffff，主内容区 #f7f7f5）
- [x]  3.3 深色模式同理：导航栏 `--surface: #161b22`，主内容区 `--bg: #0d1117`
- [x]  3.4 确认 `Sidebar.tsx` 使用 `bg-surface` 后渲染正确
- [x]  3.5 边框颜色 `--line` 微调，确保两种模式下分隔线柔和不刺眼

**完成判据**：

- 浅色模式下导航栏与主内容区颜色协调，无强烈对比
- 深色模式同理
- 所有使用 `bg-surface` / `bg-bg` 的组件渲染正确
- 无颜色闪烁或 FOUC（flash of unstyled content）

---

## T-UI.4 API 表单下拉框文字截断修复

**目标**：修复 L-04——映射方式下拉框文字不截断。

**子任务**：

- [x]  4.1 修改 `ApiConfigForm.tsx` 中"映射方式"下拉框选项文字，简化为短标签：
  - `reasoning_effort` → "reasoning_effort"
  - `budget_tokens` → "budget_tokens"
  - `custom` → "自定义 JSON"
- [x]  4.2 在下拉框下方或旁边添加说明文字（原选项中的括号说明移到此处）
- [x]  4.3 或使用 `title` 属性提供完整文字的 tooltip
- [x]  4.4 检查表单中其他可能截断的长文字（如字段 label、说明文字）

**完成判据**：

- 320px 宽度下下拉框选中值完整可见，不被截断
- 映射方式的说明信息仍然可获取（通过说明文字或 tooltip）
- 表单整体布局不受影响

---

## T-UI.5 Composer 禁用提示去重

**目标**：修复 L-05——合并 disabledReason 和 placeholder，统一提示文案。

**子任务**：

- [x]  5.1 修改 `ChatView.tsx`：`disabledReason` 保留为输入框上方的提示条（更醒目）
- [x]  5.2 修改 `Composer.tsx`：禁用时 placeholder 简化为通用提示（如"输入消息..."），不再重复"请先配置 API"
- [x]  5.3 统一文案措辞：
  - 无激活配置："请先在设置中添加并激活 API 配置"
  - 无角色："请先在设置中创建或恢复默认角色"
  - 上下文达限："上下文已满，请新建会话或删除部分消息"
- [x]  5.4 禁用提示条样式优化：`text-xs text-text-muted`，与输入框有适当间距

**完成判据**：

- Composer 区域不再出现两处意思相同的提示
- 禁用原因清晰可见、文案统一
- 启用状态下 placeholder 为"输入消息...（Enter 发送，Shift+Enter 换行）"

---

## T-UI.6 对话空状态配置引导

**目标**：修复 L-06——未配置 API 时，空状态显示明确的配置引导。

**子任务**：

- [x]  6.1 修改 `MessageList.tsx` 或 `ChatView.tsx`：空状态根据 `apiConfigs.length === 0` 动态渲染
- [x]  6.2 未配置 API 时的空状态：
  - 图标（可选，使用 SVG）
  - 标题："欢迎使用在伴 Atmate"
  - 说明："先配置一个 API 端点，即可开始对话"
  - 按钮："去配置 API"（点击调用 `onNavigate('settings')` 或通过 props 传入回调）
- [x]  6.3 已配置 API 但无消息时：保留原通用提示"开始一段对话 / 输入消息或从网页划词发送"
- [x]  6.4 `ChatView` 需要将导航回调传递给 `MessageList`（或在 `ChatView` 中渲染空状态）

**完成判据**：

- 首次使用（无 API 配置）时，空状态显示"去配置 API"按钮
- 点击按钮跳转到设置视图
- 已有 API 配置时，空状态为通用提示
- 空状态在 320px 宽度下布局正常、按钮可点击

---

## T-UI.7 TokenStatusBar 优化

**目标**：修复 L-07——进度条加粗、信息布局优化。

**子任务**：

- [x]  7.1 修改 `TokenStatusBar.tsx`：进度条高度从 `h-1.5`（6px）改为 `h-2`（8px）
- [x]  7.2 信息行布局优化：
  - 左侧：`≈12,345 / 128,000 tokens`（上下文占用）
  - 右侧：`累计 ≈45,678`（会话累计）
  - 两者之间有足够间距，320px 下不换行
- [x]  7.3 0 值时进度条显示：保留 1px 高度的底色条（`bg-surface-2`），确保用户能感知到进度条位置
- [x]  7.4 达限红条提示样式微调：`text-xs text-danger`，与进度条有间距
- [x]  7.5 状态条整体 padding 微调：`px-3 py-2` → `px-4 py-2.5`，增加呼吸感

**完成判据**：

- 进度条清晰可见，加粗后更易观察
- 320px 宽度下信息行不换行、不溢出
- 0 值时进度条位置可感知
- 达限提示醒目但不突兀

---

## T-UI.8 设置 Tab 栏增加图标

**目标**：修复 L-08——设置视图三个 Tab 增加图标辅助识别。

**子任务**：

- [x]  8.1 修改 `SettingsView.tsx` 的 `TabButton` 组件：支持图标 + 文字
- [x]  8.2 为三个 Tab 选择合适的 SVG 图标（20×20，stroke 风格，与左侧导航栏一致）：
  - API 配置：服务器/钥匙图标（如 `<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>` 或插件图标）
  - 角色：用户/面具图标（如 `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>`）
  - 偏好：滑块/调节图标（如 `<line x1="4" y1="21" x2="4" y2="14"/>` 等）
- [x]  8.3 Tab 布局：图标 + 文字水平排列，`flex items-center gap-1.5`
- [x]  8.4 激活态样式保持现有（`border-b-2 border-primary text-primary`）

**完成判据**：

- 三个 Tab 均有图标 + 文字
- 图标风格统一（stroke、20px、currentColor）
- 320px 宽度下三个 Tab 不溢出、不拥挤
- 激活/非激活状态清晰可辨

---

## T-UI.9 全局视觉风格升级

**目标**：实现 V-01——整体达到现代简洁风水准。

**子任务**：

- [x]  9.1 圆角统一：
  - 卡片/面板：`rounded-xl`（12px）
  - 按钮/输入框：`rounded-lg`（8px）
  - 标签/badge：`rounded-md`（6px）
  - 消息气泡：`rounded-2xl`（16px），用户消息右下角 `rounded-br-sm`
- [x]  9.2 阴影体系：
  - 默认卡片：无阴影或 `shadow-sm`（hover 时）
  - 抽屉/模态：`shadow-lg`
  - 悬浮元素（如 tooltip）：`shadow-md`
- [x]  9.3 间距体系：
  - 页面级 padding：`p-4`（16px）为基础，重要区域 `p-5`（20px）
  - 卡片内 padding：`p-3`（12px）或 `p-4`（16px）
  - 元素间距：`gap-2`（8px）/ `gap-3`（12px）/ `gap-4`（16px）
- [x]  9.4 字体层级：
  - 页面标题：`text-base font-semibold`（16px）
  - 卡片标题：`text-sm font-medium`（14px）
  - 正文：`text-sm`（14px）
  - 辅助文字：`text-xs`（12px）
  - 行高：正文 `leading-relaxed`，辅助 `leading-normal`
- [x]  9.5 边框统一：`border border-border`，分隔线用 `border-t` / `border-b` / `border-r`
- [x]  9.6 逐个组件检查并应用上述规范：
  - `App.tsx` / `Sidebar.tsx`
  - `chat/ChatView.tsx` / `MessageList.tsx` / `MessageItem.tsx` / `Composer.tsx` / `TokenStatusBar.tsx` / `SessionList.tsx`
  - `settings/SettingsView.tsx` / `ApiConfigList.tsx` / `ApiConfigForm.tsx` / `RoleList.tsx` / `RoleForm.tsx` / `PrefsPanel.tsx`

**完成判据**：

- 所有组件圆角、阴影、间距、字体层级统一
- 整体视觉达到现代简洁风基本水准
- 浅色/深色双模式下均美观
- 无因样式调整导致的布局错乱

---

## T-UI.10 消息气泡样式优化

**目标**：实现 V-02——用户/assistant 消息气泡样式改进。

**子任务**：

- [x]  10.1 修改 `MessageItem.tsx`：
  - 用户消息：`bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2.5`，最大宽度 `max-w-[85%]`
  - Assistant 消息：`bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-text`，最大宽度 `max-w-[90%]`
- [x]  10.2 消息间距：`space-y-4`（比原 `space-y-3` 略大，增加呼吸感）
- [x]  10.3 用户消息文字：`whitespace-pre-wrap text-sm leading-relaxed`
- [x]  10.4 Assistant 消息 Markdown 样式：保持现有 `.markdown-body`，但调整代码块背景色与气泡背景协调
- [x]  10.5 流式光标：`ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-muted`，位置在末尾文字后
- [x]  10.6 消息列表 padding：`p-4` → `px-4 py-5`，上下略增

**完成判据**：

- 用户/assistant 气泡样式区分明显、美观
- 气泡圆角有"尾巴"效果（用户消息右下角小圆角，assistant 左下角小圆角）
- Markdown 渲染（代码块、表格、列表）在气泡内正常显示
- 流式光标可见、不闪烁

---

## T-UI.11 全视图走查与回归验证

**目标**：在所有目标宽度和模式下验证所有视图，确保零回归。

**子任务**：

- [x]  11.1 构建生产版本：`pnpm build`
- [x]  11.2 本地预览：启动 HTTP 服务器，在浏览器中以 320px / 360px / 400px / 500px 四种宽度走查
- [x]  11.3 浅色模式走查清单：
  - [x]  对话视图（空状态 / 有消息 / 流式中 / 禁用态）
  - [x]  会话列表抽屉（打开 / 关闭 / 新建 / 重命名 / 删除）
  - [x]  设置·API 配置（列表 / 新建表单 / 编辑表单 / 思维强度区域）
  - [x]  设置·角色（列表 / 新建表单 / 编辑表单）
  - [x]  设置·偏好（基础指令开关）
- [x]  11.4 深色模式走查同样清单
- [x]  11.5 回归测试：`pnpm test` 全绿（273+ 例）
- [x]  11.6 类型检查：`pnpm typecheck` 通过
- [x]  11.7 Lint：`pnpm lint` 通过
- [x]  11.8 性能：侧边栏打开到可输入 <300ms（主观感知 + 如有条件用 Performance API 测量）
- [x]  11.9 记录走查结果到 `validation.md`

**完成判据**：

- 所有视图在所有宽度和模式下无布局问题
- 所有测试全绿、门禁通过
- 无功能回归（对话、设置、会话管理等核心功能正常）
- 走查结果已记录

---

## 任务依赖关系

```
T-UI.3 (配色) ──┐
                 ├──> T-UI.9 (全局视觉) ──> T-UI.11 (走查)
T-UI.1 (抽屉) ──┤
T-UI.2 (角色) ──┤
T-UI.4 (下拉) ──┤
T-UI.5 (提示) ──┤
T-UI.6 (空态) ──┤
T-UI.7 (Token) ──┤
T-UI.8 (Tab)  ──┤
T-UI.10(气泡) ──┘
```

- T-UI.3（配色 token）应优先完成，因为其他任务的样式依赖颜色 token
- T-UI.9（全局视觉）是统一定型任务，应在各组件单独修复后做全局一致性检查
- T-UI.11（走查）是最终验证，必须在所有任务完成后执行
- 其余任务（T-UI.1, 2, 4, 5, 6, 7, 8, 10）相互独立，可并行执行

## 预估工作量


| 任务              | 预估时间   | 备注                       |
| ----------------- | ---------- | -------------------------- |
| T-UI.1 抽屉       | 1.5h       | 动画 + 遮罩 + Escape       |
| T-UI.2 角色列表   | 1h         | 布局重构                   |
| T-UI.3 配色       | 1h         | 排查根因 + token 调整      |
| T-UI.4 下拉框     | 0.5h       | 文字简化                   |
| T-UI.5 提示去重   | 0.5h       | 文案统一                   |
| T-UI.6 空状态引导 | 1h         | 动态渲染 + 导航            |
| T-UI.7 Token 条   | 0.5h       | 样式微调                   |
| T-UI.8 Tab 图标   | 0.5h       | 图标选择 + 布局            |
| T-UI.9 全局视觉   | 2h         | 逐组件检查 + 统一          |
| T-UI.10 消息气泡  | 1h         | 样式优化                   |
| T-UI.11 走查回归  | 1.5h       | 四宽度 × 双模式 × 五视图 |
| **合计**          | **约 11h** | 约 1.5 人日                |
