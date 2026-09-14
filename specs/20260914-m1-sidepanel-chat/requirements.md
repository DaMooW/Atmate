# M1 · 侧边栏对话 MVP — Requirements

> 评审定案（2026-09-14，AskUserQuestion）：全范围执行、四个内置角色定义具体提示词、任务严格按 roadmap 顺序、联调以 DeepSeek 为主路径。
> 依据：[mission.md](../../mission.md)、[roadmap.md §3](../../roadmap.md)、[techniqueStack.md](../../techniqueStack.md)

## 1. 背景（Why）

M0 已交付工程骨架（WXT + React + TS + Tailwind + 门禁 + 空壳组件 + 图标 + dist 产物）。M1 是第一个**业务里程碑**：把空壳变成一个"可用的纯对话扩展"——用户能在侧边栏里配置 API、选择角色、手动输入、收到流式输出、看到 token 状态，且关闭浏览器后数据不丢。

此阶段**无 content script**（M2 才上线划词链路），素材靠手动粘贴/输入。产品灵魂（划词）在 M2 兑现，但 M1 结束时已有完整的对话体验与持久化底座。

引用的 FR/NFR：
- FR-1.1–1.4（角色系统：CRUD + 内置示例 + 会话绑定）
- FR-1.6（全局基础指令）
- FR-2.3（手动输入）
- FR-3 全部（多轮对话 + 流式 + 停止）
- FR-4 全部（API 配置，除 extraBody/温度为 M5 加分）
- FR-5.1–5.2（token 状态条 + 会话累计，估算模式）
- FR-6 全部（多会话管理 + 持久化）
- NFR-1（性能：打开到可输入 <300ms）、NFR-2（安全：Key 仅本地）、NFR-4（健壮性：错误分类）、NFR-5（可维护性：分层 + 单测）

## 2. 范围（Scope）

### 在范围

| 领域 | 内容 | 对应 T |
|---|---|---|
| core 域层 + storage | schema v1 落地、nanoid、schemaVersion 迁移骨架、storage 同步层 | T1.1 |
| API 配置 | 列表/新建/编辑/删除/切换激活；字段校验；思维强度三映射；contextLimit 预填表；连接测试 | T1.2 |
| 角色 | CRUD + 四个内置示例角色（**含具体 system prompt**）；新建会话选角色 | T1.3 |
| LLM 客户端 | 请求构造、SSE 解析、停止、错误分类、collectUsage 探测降级 | T1.4 |
| 对话视图 | 消息流、末条增量渲染、Markdown+高亮、发送/停止 | T1.5 |
| TokenStatusBar | 估算、三段变色、达限禁发 | T1.6 |
| 会话列表 | 切换/重命名/删除/持久化；标题自动生成 | T1.7 |
| Token 估算 | 估算函数 + 会话累计 in core，中英混合样例单测 | T1.8 |
| 基础指令 | DIRECTIVE_V1 常量 + 设置开关 + system 拼装 | T1.9 |
| spec 归档 | 本目录归档为已实现版 | T1.10 |

### 明确不做（本里程碑）

- **划词集成**（content script / 浮动按钮 / 右键菜单）→ M2
- **PDF 支持** → M3
- **图像输入**（vision 开关、图片归一化、schema v2 parts 化）→ M4
- **usage 精确模式**（API 返回 usage 全量替换估算）→ M5 T5.1；M1 只做 collectUsage 探测降级骨架与估算模式
- **超限治理（压缩历史）、reasoning 折叠展示、单条 token 分解、导出、快捷键、温度/extraBody** → M5
- **i18n 中英切换** → M6；M1 UI 文案先中文硬编码（字典化留 M6）
- **E2E 测试**（Playwright）→ M3 后引入；M1 只做 L1/L2 单测，L3 组件测试在交互稳定后按需引入
- 权限新增：本里程碑仅加 `storage`；`contextMenus` 留 M2，`unlimitedStorage` 留 M4

## 3. 决策（Decisions）

| # | 决策 | 依据 |
|---|---|---|
| D1 | M1 范围严格 = roadmap T1.1–T1.10，不裁剪、不增项 | 评审 Q1：全范围执行 |
| D2 | 四个内置示例角色（翻译官 / 摘要助手 / 代码审查员 / 学术解说员）在本里程碑定义**具体 system prompt**，不做占位 | 评审 Q1：用户选择"定义角色提示词"；FR-1.3 要求内置角色可查看/复制 |
| D3 | 任务执行顺序严格按 roadmap T1.1→T1.2→…→T1.10，不重排 | 评审 Q2：用户明确"严格按照 roadmap 顺序来" |
| D4 | 联调验收以 **DeepSeek** 为主路径（验 reasoning_content 方言与流式主链路）；roadmap 原列五家端点（智谱 GLM / OpenRouter / Kimi / 硅基流动）列为**后续补验**，不在本里程碑合并门槛内 | 评审 Q3：用户目前仅持有 DeepSeek API Key；主路径跑通即可合并，其余端点补验不阻塞 |
| D5 | 测试按 techniqueStack §10 四层金字塔执行；M1 收尾时关闭 `passWithNoTests`（M0 过渡期豁免结束）；每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成 | roadmap §1 DoD（v0.5 强化）；techniqueStack §10 |
| D6 | 权限新增 `storage`（持久化必需）；manifest permissions 从 `["sidePanel"]` 变为 `["sidePanel", "storage"]`；不新增 host_permissions（M1 仅 fetch 用户自配 Base URL，已有 `<all_urls>` 声明在 M0 manifest 中） | tech §3；最小权限原则 |
| D7 | 思维强度三映射按 tech §5 `ThinkingConfig` 实现：`reasoning_effort` / `budget_tokens` / custom 模板 + `{{level}}` 插值；UI 提供三档选择 + 自定义模板编辑 | FR-4.3；tech §5 |
| D8 | contextLimit 预填表按 tech §7 维护 `modelId → limit` 映射，收录常见模型（含聚合站 `org/model` 命名）；未命中要求手填且保存前必填校验 | FR-4.2；tech §7 |
| D9 | Token 估算用混合系数 `ceil(总字符数 / 3.2)`，UI 数字前强制加"≈"；不引入 BPE 分词库（Q4 暂缓） | tech §7；roadmap 开放问题 Q4 |
| D10 | 基础指令 `DIRECTIVE_V1` 为 `core/directive.ts` 版本化常量，内容实现 mission FR-1.6 三条（完备性判断 / 缺失清单 / 不编造）；开关存 `at:uiPrefs.baseDirectiveEnabled`，默认 true | FR-1.6；tech §8.1 |

## 4. 上下文与约束（Context & Constraints）

### 4.1 数据模型与存储（tech §5）

- **schemaVersion = 1**（M4 才升 v2 做消息 parts 化）
- 存储键（`at:` 前缀）：
  - `at:meta`：`{ schemaVersion: 1 }`
  - `at:apiConfigs`：`ApiConfig[]`
  - `at:activeApiConfigId`：`string | null`
  - `at:roles`：`Role[]`（含四个 builtin 角色）
  - `at:sessions`：`Session[]`
  - `at:uiPrefs`：`{ baseDirectiveEnabled: boolean, defaultContextScope: 'selection', locale: 'zh-CN' }`
- `ApiConfig` 字段：id / name / baseUrl / apiKey / modelId / contextLimit / thinking{enabled,level,config} / collectUsage / vision（默认 false，M4 才用）
- `ChatMessage`：M1 为纯文本（`content: string`），reasoning 旁路采集但不展示（M5 才折叠展示），usage 字段预留
- `Session`：id / roleId / title / messages[] / createdAt / updatedAt
- 同步层：`createStorageStore`——启动一次性装载 + `chrome.storage.onChanged` 回流广播

### 4.2 LLM 客户端（tech §6）

- 仅 OpenAI 兼容 `POST {baseUrl}/chat/completions`
- 请求构造：`messages = [system(角色+基础指令)] + 历史 + user`
- SSE 解析：`data:` 逐行、`[DONE]` 结束、`delta.content` 累积正文、`delta.reasoning_content`（DeepSeek）与 `delta.reasoning`（OpenRouter）采集进 reasoning 旁路
- 事件回调：`onContent / onReasoning / onUsage / onDone / onError`
- AbortController 实现停止
- collectUsage：附 `stream_options: { include_usage: true }`，端点 400 则去掉重试一次并缓存探测结果
- 错误分类：401/403（Key）、404（URL/模型）、429（限流）、5xx、网络中断、SSE 断流——各给中文提示

### 4.3 组件层级（tech §4）

M1 在 M0 空壳之上填肉：
- `App` → `Sidebar`（会话列表入口 + 设置入口）+ `Main`
- 对话视图：`MessageList`（`MessageItem`）、`Composer`（输入框 + 发送/停止）、`TokenStatusBar`
- 设置视图：API 配置列表/表单、角色列表/表单、偏好（基础指令开关）
- 会话列表：侧栏内展开或独立视图

### 4.4 四个内置角色提示词（D2）

在 `core/builtinRoles.ts` 定义，`builtin: true`，用户可查看/复制但不可删除：

1. **翻译官**：专精翻译，保留原文格式（代码块/表格），术语按上下文领域处理，输出译文后可附简短术语说明
2. **摘要助手**：提取核心论点与关键信息，结构化输出（要点/结论/待确认），不添加原文没有的信息
3. **代码审查员**：从正确性/性能/可读性/安全四维度审查，给出具体修改建议与代码片段，不做泛泛评价
4. **学术解说员**：将学术内容转化为通俗解释，标注关键概念与假设，指出论证链条中的薄弱环节

> 具体 prompt 文案在实现 T1.3 时定稿，写入 `core/builtinRoles.ts` 并在本文件追加。

### 4.5 边界与异常

| 场景 | 处理 |
|---|---|
| SSE 断流（连接中途关闭） | 错误分类"连接中断"，已接收内容保留，提供重试入口 |
| 畸形 chunk（非 JSON / 缺 choices / delta 为空） | 跳过该 chunk 不崩溃，累计警告，流结束后提示 |
| 空 delta 连续出现 | 不渲染空白，不影响后续 |
| 401/403 | "API Key 无效或无权限"，引导去设置检查 |
| 404 | "Base URL 或模型 ID 有误"，引导检查 |
| 429 | "请求限流，请稍后重试" |
| 5xx | "服务端错误，可重试" |
| 超长文本（> contextLimit） | TokenStatusBar 红条禁发，提示超出上限 |
| 无激活 API 配置 | 发送按钮禁用，提示先配置 |
| 无激活角色 | 新建会话时强制选择 |
| storage 读取失败 | 降级为空初始状态，不崩溃 |
| schemaVersion 不匹配 | 迁移函数处理；未知版本报错而非静默 |

### 4.6 性能约束（NFR-1）

- 打开面板到可输入 < 300ms（本地环境）
- 流式渲染增量追加末条消息，不全量重渲染
- storage 读取在启动时一次性完成，不阻塞 UI 首帧（可先渲染骨架）

### 4.7 安全约束（NFR-2）

- API Key 仅存 `chrome.storage.local`，UI 默认脱敏显示
- Key 不写入任何日志（包括 console）
- 请求直连用户配置的 Base URL，无第三方中转
