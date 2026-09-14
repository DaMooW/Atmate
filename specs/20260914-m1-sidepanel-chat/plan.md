# M1 · 侧边栏对话 MVP — Plan

> 分支：`20260914-m1-sidepanel-chat` · 依据：[roadmap.md §3](../../roadmap.md)（M1）、[mission.md](../../mission.md)、[techniqueStack.md](../../techniqueStack.md)
> 任务组与 roadmap T1.1–T1.10 **严格按顺序一一对应**（评审 D3）；每组完成即在本文勾选，并同步回勾 roadmap.md。
> 测试强制：每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成（roadmap §1 DoD）。

## 1. core 域层 + storage 同步层（对应 T1.1）

**目标**：tech §5 数据模型落地，storage 同步层可用，schema 迁移骨架就位。

- [x] 1.1 定义域类型：`ApiConfig` / `Role` / `ChatMessage` / `Session` / `ThinkingConfig` / `ThinkingLevel` / `MsgSource`（`core/types.ts`），与 tech §5 完全对齐
- [x] 1.2 `at:meta` schemaVersion = 1；迁移函数骨架 `migrateSchema(currentVersion, targetVersion)`，未知版本抛错
- [x] 1.3 自写短 ID 生成器（零依赖，`crypto.getRandomValues`）；ID 生成纯函数 + 单测
- [x] 1.4 storage 同步层 `useStorageStore`（zustand）：启动一次性装载所有 `at:*` 键 → 内存 store；写操作 → `storage.local.set` → `onChanged` 回流广播；多上下文一致
- [x] 1.5 初始状态：无数据时生成默认 uiPrefs（baseDirectiveEnabled=true）、空 apiConfigs/roles/sessions
- [x] 1.6 目录结构就绪：创建 `prompts/`（含 `roles/` 子目录）、`core/`、`infra/`、`tests/core/`、`tests/infra/` 目录；Vite `?raw` 导入类型声明（`types/vite-env.d.ts`）
- [x] 1.7 **L1 单测**：ID 生成（5 例）、schema 迁移（7 例）、初始状态（4 例）
- [x] 1.8 **L2 单测**：storage 同步层读写 + onChanged 回流（13 例，`vi.mock('wxt/browser')` + fakeBrowser）
- [x] 1.9 manifest 新增 `storage` 权限（D6）；`CHROMEWEBSTORE.md` 同步记录权限理由

**完成判据**：三门禁全绿（typecheck / lint / 69 tests passed）；构建成功；storage 读写 round-trip 正确。

## 2. 设置视图·API 配置（对应 T1.2）

**目标**：用户可完整管理多套 API 配置，含思维强度模型能力推荐与连接测试。

- [x] 2.1 API 配置列表：展示所有配置，高亮激活项，支持切换激活（`components/settings/ApiConfigList.tsx`）
- [x] 2.2 新建/编辑表单：name / baseUrl / apiKey（脱敏输入）/ modelId / contextLimit / thinking / collectUsage；字段校验（`components/settings/ApiConfigForm.tsx` + `core/validation.ts`）
- [x] 2.3 删除配置：确认弹窗；删除激活项时激活态置空（切换到第一个或 null）
- [x] 2.4 **模型能力表** `core/modelCapabilities.ts`：预填常见模型的 `thinkingType / levels / defaultLevel`（D7）；精确匹配 + 前缀匹配 + 默认回退
- [x] 2.5 思维强度 UI 动态推荐：选择 modelId 后自动设置 mapping 类型；`none` 类型自动关闭并提示；用户可手动切换为 custom（JSON 模板 + `{{level}}` 插值）
- [x] 2.6 思维强度三映射实现：`reasoning_effort` / `budget_tokens` / custom（`core/thinking.ts` 的 `buildThinkingBody`）；档位 off/light/medium/deep
- [x] 2.7 contextLimit 预填表 `core/contextLimits.ts`：收录 gpt-* / claude-* / glm-* / deepseek-* / kimi-* / 聚合站 org/model 命名；命中自动填，未命中手填
- [x] 2.8 连接测试按钮 `infra/llm/connectionTest.ts`：发送最小非流式请求，成功/失败反馈，HTTP 状态码中文分类
- [x] 2.9 apiKey UI 脱敏：默认 password 输入，点击显示/隐藏；不写入 console
- [x] 2.10 **L1 单测**：validation（29 例）、modelCapabilities（11 例）、thinking（13 例）、contextLimits（10 例）
- [x] 2.11 **L2 单测**：连接测试 fetch mock（12 例：成功/401/403/404/429/400/500/网络错误/URL 拼接/请求头/请求体）

**完成判据**：选择 DeepSeek 模型后自动推荐 `reasoning_effort` + low/medium/high；选择 gpt-4o 后思维强度自动关闭；可手动覆盖为 custom；三门禁全绿（144 tests passed）。

## 3. 设置视图·角色（对应 T1.3）

**目标**：角色 CRUD 可用，四个默认角色首次启动 seed（prompt 外置），seed 后与普通角色同等可编辑/删除，提供恢复默认入口。

- [x] 3.1 `prompts/roles/` 目录：创建四个 `.md` 文件（translator / summarizer / code-reviewer / academic-explainer），写入具体 system prompt（D2 / D11）
- [x] 3.2 `core/builtinRoles.ts`：通过 `?raw` 导入四个 prompt 文件，导出 `BUILTIN_ROLES` / `createBuiltinRoles()` / `getMissingBuiltinRoles()`；不内嵌 prompt 文本
- [x] 3.3 首次启动 seed：storage `init()` 时若 `at:roles` 为空，将四个默认角色写入（`builtin: true` 标记）；非首次不重复 seed
- [x] 3.4 角色列表 `components/settings/RoleList.tsx`：展示所有角色；`builtin: true` 显示"默认"角标，操作权限与普通角色相同（可编辑/删除/复制）
- [x] 3.5 新建/编辑角色 `components/settings/RoleForm.tsx`：name / systemPrompt（多行文本）/ description（可选）；icon 字段预留暂不实现 UI
- [x] 3.6 删除角色：所有角色均可删（含默认角色）；确认弹窗提示"引用该角色的会话会保留但显示角色已删除"
- [x] 3.7 复制角色：所有角色均可复制为新角色（`builtin: false`，名称加"副本"后缀）
- [x] 3.8 "恢复默认角色"入口：角色列表顶部按钮，仅 seed 列表中不存在的默认角色（按 ID 匹配，不覆盖已有）；全部存在时按钮不显示
- [ ] 3.9 新建会话时选择角色：**依赖 T1.7 会话列表 UI**，在 T1.7 中集成角色选择下拉
- [x] 3.10 **L1 单测**：builtinRoles（13 例：prompt 导入非空 / createBuiltinRoles / getMissingBuiltinRoles 按 ID 匹配 / 用户重命名不算缺失）
- [x] 3.11 **L2 单测**：storage init seed 行为（空列表 seed 四个 / 已有角色不重复 seed / 不写入 roles），storage 测试扩充至 14 例

**完成判据**：首次启动有四个默认角色且 prompt 非空；可编辑/删除默认角色；删除后可通过"恢复默认"补回；三门禁全绿（158 tests passed）。

## 4. LLM 客户端（对应 T1.4）

**目标**：infra/llm 客户端可用，支持流式、停止、错误分类、collectUsage 探测降级。

- [x] 4.1 请求构造 `infra/llm/requestBuilder.ts`：`buildRequest(config, role, history, current, {stream, includeUsage, baseDirectiveEnabled})` → 完整请求体（含思维强度字段注入、system 拼装、extraBody/temperature 预留）
- [x] 4.2 SSE 解析器 `infra/llm/sseParser.ts`：`parseSSE(readableStream, callbacks)`——逐行 `data:`、`[DONE]` 结束、`delta.content` 累积、`delta.reasoning_content`（DeepSeek）/ `delta.reasoning`（OpenRouter）采集、usage chunk 解析、畸形 JSON 不中断
- [x] 4.3 流式主函数 `infra/llm/client.ts`：`streamChat(config, role, history, current, options)` → `{ abort, promise }`，fetch + AbortController + SSE 解析
- [x] 4.4 停止：`handle.abort()` → `AbortController.abort()` → 抛出 `aborted` 类型错误
- [x] 4.5 错误分类 `infra/llm/errors.ts`：`classifyHttpError`（401/403→auth、404→not_found、429→rate_limit、400→bad_request、5xx→server）+ `classifyNetworkError`（AbortError→aborted、TypeError→network），中文可读消息
- [x] 4.6 collectUsage 探测降级：首次带 `stream_options.include_usage`，400 则去掉重试一次；探测结果通过返回值 `collectUsageUsed` 暴露，配置更新由调用方在 T1.5 中处理
- [x] 4.7 usage 采集：流末尾 usage chunk 解析，`onUsage` 回调 + 返回值 `usage`
- [x] 4.8 **L1 单测**：systemPrompt（4 例）、requestBuilder（15 例：思维强度三映射注入 / system 拼装 / stream 标志 / extraBody / temperature）、errors（14 例：HTTP 全状态 / 网络错误 / 响应体提取）、sseParser（13 例：正常流 / [DONE] / reasoning 两种方言 / usage / 畸形 JSON / 空 delta / 无 [DONE] / 非 data 行）
- [x] 4.9 **L2 单测**：client（12 例：成功流 / 401 / 404 / 429 / 网络错误 / abort / collectUsage 探测降级 / collectUsageSupported=false / collectUsage=false / usage 透传 / URL 正确 / onContent 回调）

**完成判据**：流式请求首块可见、停止立即生效、断网有中文提示；collectUsage 探测降级自动重试；三门禁全绿（216 tests passed）。

## 5. 对话视图（对应 T1.5）

**目标**：消息流渲染正确，流式增量更新，Markdown+代码高亮，发送/停止可用。

- [x] 5.1 `components/chat/MessageList.tsx`：渲染消息列表，区分 user/assistant；自动滚动到底部；错误展示 + 重试按钮
- [x] 5.2 `components/chat/MessageItem.tsx`：content 渲染（react-markdown + remark-gfm + rehype-highlight + highlight.js github 主题）；user 右对齐/assistant 左对齐；流式中显示光标
- [x] 5.3 流式增量渲染：onContent 回调中仅更新末条 assistant 消息的 content，不全量重渲染
- [x] 5.4 `components/chat/Composer.tsx`：多行输入框（Enter 发送 / Shift+Enter 换行）、自动高度、发送按钮、停止按钮（流式中显示）
- [x] 5.5 发送流程 `components/chat/ChatView.tsx`：取当前会话 + 激活配置 + 角色 → 构造 messages → 调 streamChat → 增量渲染 → 结束后存盘（setSessions）
- [x] 5.6 无激活配置/无角色时：发送禁用 + 引导提示（disabledReason）
- [x] 5.7 错误展示：流式出错时在消息流末尾显示中文错误提示 + 重试按钮（使用最后一条用户消息重试）
- [x] 5.8 Markdown 渲染：表格、代码块（带语言高亮）、列表、引用、标题正常（assets/style.css .markdown-body 样式）
- [x] 5.9 **L1 单测**：消息组装纯函数已在 requestBuilder 测试中覆盖（15 例，含 system + 历史 + user 顺序、历史 system 过滤）
- [ ] 5.10 **L3 组件测试**（按需，交互稳定后）：Composer 发送/停止切换、MessageList 渲染 — M1 后引入 @testing-library/react，本里程碑不做

**完成判据**：手动输入 → 发送 → 流式输出 → Markdown 渲染正确 → 停止生效 → 错误有提示；三门禁全绿（216 tests passed），构建成功（533.41 kB）。

## 6. TokenStatusBar（对应 T1.6）

**目标**：状态条常驻显示上下文占用与上限，三段变色，达限禁发。

- [x] 6.1 `components/chat/TokenStatusBar.tsx`：进度条 + `≈x / y` 文本 + 会话累计 token
- [x] 6.2 三段变色：`<70%` 常态（蓝）/ `≥70%` 黄 / `≥90%` 红（`core/tokens.ts` 的 `contextLevel`）
- [x] 6.3 达限禁发：上下文占用 ≥ contextLimit 时发送按钮禁用 + 红条提示（`ChatView` 集成 `isContextLimitReached`）
- [x] 6.4 估算模式标注：数字前加 `≈`，hover 显示口径说明（"按字符数估算，±15%"）
- [x] 6.5 每轮发送前更新估算值；流式结束后若有 usage 则更新精确值 — M1 使用估算值，精确值接口预留（`Session.cumulativeTokens`），T1.8 完善估算精度
- [x] 6.6 **L1 单测**：`core/tokens.ts`（26 例：estimateTokens 中文/英文/混合/空/日韩文、contextPercent 截断、contextLevel 阈值 69/70/71/89/90/91、isContextLimitReached）
- [ ] 6.7 **L3 组件测试**（按需）：进度条渲染与变色 — M1 后引入 @testing-library/react，本里程碑不做

**完成判据**：上下文占用实时显示；三段变色正确（69% 蓝/70% 黄/90% 红）；达限禁发；三门禁全绿（242 tests passed），构建成功（535.38 kB）。

## 7. 会话列表（对应 T1.7）

**目标**：多会话管理完整，持久化，标题自动生成。

- [x] 7.1 `components/chat/SessionList.tsx`：会话列表 UI（标题 + 时间），高亮当前会话，按 updatedAt 降序
- [x] 7.2 切换会话：点击切换，对话视图更新（currentSessionId 提升到 App 管理）
- [x] 7.3 新建会话：选角色 → 创建空会话 → 自动切换（T1.3 的 3.9 在此实现）
- [x] 7.4 重命名会话：内联编辑（Enter 保存 / Esc 取消 / 失焦保存）
- [x] 7.5 删除会话：确认弹窗；删除当前会话时切换到最近一个或空状态
- [x] 7.6 持久化：会话变更通过 `setSessions` 自动写 storage；重启浏览器恢复（storage store 已实现）
- [x] 7.7 标题自动生成：首条用户消息前 20 字（`core/session.ts` 的 `generateSessionTitle`）；无消息时"新会话"
- [x] 7.8 排序：按 updatedAt 降序（`sortSessionsByUpdatedAt`）
- [x] 7.9 **L1 单测**：`core/session.ts`（15 例：标题生成 20 字截断/空消息/纯空白/只有 assistant/system、排序、更新消息、删除、重命名）
- [x] 7.10 **L2 单测**：会话持久化读写已在 storage.test.ts 中覆盖（setSessions 方法）

**完成判据**：创建/切换/重命名/删除会话正常；新建会话时选择角色；关闭重开浏览器数据恢复；三门禁全绿（257 tests passed），构建成功（540.67 kB）。

## 8. Token 估算 + 会话累计 in core（对应 T1.8）

**目标**：估算函数准确可靠，会话累计逻辑在 core 层。

- [x] 8.1 `core/tokens.ts`：`estimateTokens(text, ratio=3.2)` → `ceil(总字符数 / 3.2)`（tech §7），支持自定义 ratio
- [x] 8.2 `estimateMessagesTokens(messages)` → 序列化所有消息（role + content）后估算，每条消息额外 4 token 结构开销
- [x] 8.3 会话累计：`Session.cumulativeTokens`，每轮结束后 `+= estimateRoundTokens(user, assistant)`（ChatView 流式结束后更新）
- [x] 8.4 估算与精确混合：`estimateRoundTokens` 有 usage 时用精确值（`usage.total`），无 usage 时用估算值；`usage.total=0` 回退到估算
- [x] 8.5 **L1 单测**：空文本 / 超长文本（100k 字符）/ 纯中文 / 纯英文 / 中英混合 / 仅空白字符 / 自定义 ratio——覆盖 tech §10 边界用例强制清单
- [x] 8.6 **L1 单测**：会话累计（`estimateRoundTokens` 精确+估算混合、usage.total=0 回退、空消息）

**完成判据**：中英混合样例估算值在合理范围（±15%）；累计逻辑正确；三门禁全绿（262 tests passed），构建成功（540.90 kB）。

## 9. 基础指令（对应 T1.9）

**目标**：FR-1.6 全局基础指令落地，开关可控，system 拼装正确，prompt 文本外置。

- [x] 9.1 `prompts/directive-v1.md`：写入 DIRECTIVE_V1 完整文本（三条：完备性判断 / 缺失清单 / 不编造）（T1.4 已创建）
- [x] 9.2 `core/directive.ts`：通过 `?raw` 导入 `directive-v1.md`，导出 `DIRECTIVE_V1` 常量与版本号；不内嵌 prompt 文本（T1.4 已创建）
- [x] 9.3 设置·偏好页 `components/settings/PrefsPanel.tsx`：基础指令开关（默认开），存 `at:uiPrefs.baseDirectiveEnabled`；开启时展示当前指令内容预览
- [x] 9.4 LLM 客户端 system 拼装 `core/systemPrompt.ts`：`system = 角色提示词` +（开启时）`\n\n` + `DIRECTIVE_V1`（T1.4 已创建）
- [x] 9.5 开关变更后下一次发送生效，不追溯已发生请求（uiPrefs 状态实时读取，每次发送时拼装）
- [x] 9.6 **L1 单测**：拼装顺序（角色在前、指令在后）、开关关闭不追加、DIRECTIVE_V1 内容包含三条关键词、prompt 文件导入非空（T1.4 已创建 systemPrompt.test.ts，4 例）
- [x] 9.7 **L2 单测**：开关持久化（storage.test.ts 中 uiPrefs 测试已覆盖 setUiPrefs 方法）

**完成判据**：开启时请求体末尾含完备性三条款；关闭后不再追加；prompt 文本在 `prompts/directive-v1.md` 中可独立编辑；三门禁全绿（262 tests passed），构建成功（544.33 kB）。

## 10. spec 归档（对应 T1.10）

**目标**：本目录三件套更新为已实现版，roadmap 回勾，变更记录追加。

- [x] 10.1 本目录 requirements/plan/validation 三件套更新为"已实现"状态（勾选完成项、记录实际结果）
- [x] 10.2 roadmap.md T1.1–T1.9 全部回勾为 `[x]`，T1.10 勾选
- [x] 10.3 roadmap.md §10 追加一行 M1 变更记录
- [x] 10.4 `CHROMEWEBSTORE.md` 确认权限说明已更新（storage 权限理由：保存会话历史、角色预设与 API 配置）
- [x] 10.5 确认 `passWithNoTests` 已关闭（vitest.config.ts 改为 false）

**完成判据**：roadmap M1 全部勾选，变更记录已追加，spec 目录状态为已实现；三门禁全绿（262 tests passed）。

---

## 执行顺序说明

严格按 1→2→3→4→5→6→7→8→9→10 执行（评审 D3）。其中：
- 任务 1（core+storage）是所有后续任务的底座，必须最先完成
- 任务 4（LLM 客户端）与任务 8（token 估算）为纯 infra/core，可在任务 2/3（设置 UI）并行思考但按序提交
- 任务 5（对话视图）依赖 1/2/3/4 全部就绪
- 任务 6（TokenStatusBar）依赖 8（估算函数）
- 任务 10（归档）在全部完成后执行
