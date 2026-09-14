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

- [ ] 2.1 API 配置列表：展示所有配置，高亮激活项，支持切换激活
- [ ] 2.2 新建/编辑表单：name / baseUrl / apiKey（脱敏输入）/ modelId / contextLimit / thinking / collectUsage；字段校验（URL 格式、必填、contextLimit 为正整数）
- [ ] 2.3 删除配置：确认弹窗；删除激活项时激活态置空
- [ ] 2.4 **模型能力表** `core/modelCapabilities.ts`：预填常见模型的 `thinkingType / levels / defaultLevel`（D7，见 requirements §4.8）；支持精确匹配 + 前缀匹配
- [ ] 2.5 思维强度 UI 动态推荐：选择 modelId 后自动设置 mapping 类型与 level 下拉选项；`none` 类型置灰并提示；用户可手动切换为 custom（JSON 模板 + `{{level}}` 插值）
- [ ] 2.6 思维强度三映射实现：`reasoning_effort`（值表）/ `budget_tokens`（`thinking: {type:'enabled', budget_tokens}`）/ custom（模板插值）；档位 off/light/medium/deep
- [ ] 2.7 contextLimit 预填表：`modelId → limit` 映射（收录 gpt-* / claude-* / glm-* / deepseek-* / kimi-* / 聚合站 org/model 命名）；命中自动填，未命中手填必填
- [ ] 2.8 连接测试按钮：发送最小请求（`messages: [{role:'user', content:'hi'}]`，非流式），成功/失败反馈
- [ ] 2.9 apiKey UI 脱敏：默认 `••••`，点击显示/隐藏；不写入 console
- [ ] 2.10 **L1 单测**：字段校验函数（URL/必填/数值范围）、模型能力表匹配（精确/前缀/未命中）、思维强度映射构造（三种 mapping × 各档位）、预填表命中逻辑
- [ ] 2.11 **L2 单测**：连接测试的 fetch mock（成功/401/404/超时）

**完成判据**：选择 DeepSeek 模型后自动推荐 `reasoning_effort` + low/medium/high；选择不支持思维链的模型后开关置灰；可手动覆盖为 custom。

## 3. 设置视图·角色（对应 T1.3）

**目标**：角色 CRUD 可用，四个默认角色首次启动 seed（prompt 外置），seed 后与普通角色同等可编辑/删除，提供恢复默认入口。

- [ ] 3.1 `prompts/roles/` 目录：创建四个 `.md` 文件（translator / summarizer / code-reviewer / academic-explainer），写入具体 system prompt（D2 / D11，文案见 requirements §4.4）
- [ ] 3.2 `core/builtinRoles.ts`：通过 `?raw` 导入四个 prompt 文件，导出默认角色元数据（id / name / description / promptSource）；不内嵌 prompt 文本
- [ ] 3.3 首次启动 seed：storage 初始化时若 `at:roles` 为空，将四个默认角色写入（`builtin: true` 标记）；非首次不重复 seed
- [ ] 3.4 角色列表：展示所有角色；`builtin: true` 的角色显示"默认"角标，但**操作权限与普通角色相同**（可编辑/删除/复制）
- [ ] 3.5 新建/编辑角色：name / systemPrompt（多行文本）/ icon（可选）/ description（可选）
- [ ] 3.6 删除角色：所有角色均可删（含默认角色）；确认弹窗；删除后引用该角色的会话保留 roleId 但显示"角色已删除"
- [ ] 3.7 复制角色：所有角色均可复制为新角色（`builtin: false`）
- [ ] 3.8 "恢复默认角色"入口：设置页角色区域提供按钮，仅 seed 列表中不存在的默认角色（不覆盖已有同名/同 id 角色）；全部存在时按钮置灰
- [ ] 3.9 新建会话时选择角色：弹窗或下拉，默认选中第一个；无角色时引导先创建
- [ ] 3.10 **L1 单测**：默认角色 prompt 导入非空、seed 逻辑（空列表 seed 四个 / 非空不重复）、恢复默认（缺失才补 / 已有不覆盖）、角色 CRUD 纯函数
- [ ] 3.11 **L2 单测**：角色持久化读写（fakeBrowser storage）

**完成判据**：首次启动有四个默认角色且 prompt 非空；可编辑/删除默认角色；删除后可通过"恢复默认"补回；新建会话能选角色。

## 4. LLM 客户端（对应 T1.4）

**目标**：infra/llm 客户端可用，支持流式、停止、错误分类、collectUsage 探测降级。

- [ ] 4.1 请求构造：`buildRequest(config, messages, {stream, includeUsage})` → 完整请求体（含思维强度字段注入、system 拼装）
- [ ] 4.2 SSE 解析器：`parseSSE(readableStream, callbacks)`——逐行 `data:`、`[DONE]` 结束、`delta.content` 累积、`delta.reasoning_content` / `delta.reasoning` 采集
- [ ] 4.3 流式主函数 `streamChat(config, messages, callbacks)`：fetch + AbortController + SSE 解析
- [ ] 4.4 停止：`abortController.abort()` 立即中断 fetch，触发 onError('aborted') 或 onDone
- [ ] 4.5 错误分类：HTTP 状态码 → 中文提示映射（401/403/404/429/5xx/网络错误/断流）
- [ ] 4.6 collectUsage 探测降级：首次带 `stream_options.include_usage`，400 则去掉重试一次，缓存 `collectUsageSupported: false` 到配置上
- [ ] 4.7 usage 采集：流结束若有 usage chunk，取 `total_tokens` 回调
- [ ] 4.8 **L1 单测**：请求构造（思维强度三映射 × system 拼装顺序）、SSE 解析器（正常流 / `[DONE]` / 断流 / 畸形 chunk / 空 delta / reasoning 两种方言 / 多行 data 合并）——覆盖 tech §10 边界用例强制清单
- [ ] 4.9 **L2 单测**：fetch mock（成功流 / 401 / 404 / 429 / 5xx / 网络中断）、abort 行为、collectUsage 探测降级（400 → 重试 → 缓存）

**完成判据**：用 DeepSeek 配置发起真实流式请求，首块可见、停止立即生效、断网有中文提示；单测覆盖全部边界用例。

## 5. 对话视图（对应 T1.5）

**目标**：消息流渲染正确，流式增量更新，Markdown+代码高亮，发送/停止可用。

- [ ] 5.1 `MessageList`：渲染消息列表，区分 user/assistant/system；自动滚动到底部
- [ ] 5.2 `MessageItem`：content 渲染（react-markdown + remark-gfm + rehype-highlight）；user 消息右对齐/assistant 左对齐
- [ ] 5.3 流式增量渲染：仅末条 assistant 消息增量追加，不全量重渲染（NFR-1）
- [ ] 5.4 `Composer`：多行输入框（Enter 发送 / Shift+Enter 换行）、发送按钮、停止按钮（流式中显示停止）
- [ ] 5.5 发送流程：取当前会话 + 激活配置 + 角色 → 构造 messages → 调 streamChat → 增量渲染 → 结束后存盘
- [ ] 5.6 无激活配置/无角色时：发送禁用 + 引导提示
- [ ] 5.7 错误展示：流式出错时在末条消息下方显示中文错误提示 + 重试按钮
- [ ] 5.8 Markdown 渲染：表格、代码块（带语言高亮）、列表、引用正常
- [ ] 5.9 **L1 单测**：消息组装纯函数（system + 历史 + user 顺序）
- [ ] 5.10 **L3 组件测试**（按需，交互稳定后）：Composer 发送/停止切换、MessageList 渲染

**完成判据**：手动输入 → 发送 → 流式输出 → Markdown 渲染正确 → 停止生效 → 错误有提示。

## 6. TokenStatusBar（对应 T1.6）

**目标**：状态条常驻显示上下文占用与上限，三段变色，达限禁发。

- [ ] 6.1 `TokenStatusBar` 组件：进度条 + `≈x / y` 文本 + 会话累计 token
- [ ] 6.2 三段变色：<70% 常态 / ≥70% 黄 / ≥90% 红
- [ ] 6.3 达限禁发：上下文占用 ≥ contextLimit 时发送按钮禁用 + 红条提示
- [ ] 6.4 估算模式标注：数字前加"≈"，hover 显示口径说明（"按字符数估算，±15%"）
- [ ] 6.5 每轮发送前更新估算值；流式结束后若有 usage 则更新精确值（M1 预留接口，精确模式 M5 全量替换）
- [ ] 6.6 **L1 单测**：阈值判定函数（69%/70%/71%、89%/90%/91%）、禁发逻辑
- [ ] 6.7 **L3 组件测试**（按需）：进度条渲染与变色

**完成判据**：伪造 contextLimit=100，输入超长文本触发达限禁发；三段变色正确。

## 7. 会话列表（对应 T1.7）

**目标**：多会话管理完整，持久化，标题自动生成。

- [ ] 7.1 会话列表 UI：展示所有会话（标题 + 时间），高亮当前会话
- [ ] 7.2 切换会话：点击切换，对话视图更新
- [ ] 7.3 新建会话：选角色 → 创建空会话 → 自动切换
- [ ] 7.4 重命名会话：内联编辑或弹窗
- [ ] 7.5 删除会话：确认弹窗；删除当前会话时切换到最近一个或空状态
- [ ] 7.6 持久化：会话变更自动写 storage；重启浏览器恢复
- [ ] 7.7 标题自动生成：默认取首条用户消息前 20 字；无消息时"新会话"
- [ ] 7.8 排序：按 updatedAt 降序
- [ ] 7.9 **L1 单测**：标题生成（20 字截断 / 空消息 / 纯空白）、会话 CRUD 纯函数
- [ ] 7.10 **L2 单测**：会话持久化读写（fakeBrowser storage）

**完成判据**：创建/切换/重命名/删除会话正常；关闭重开浏览器数据恢复。

## 8. Token 估算 + 会话累计 in core（对应 T1.8）

**目标**：估算函数准确可靠，会话累计逻辑在 core 层。

- [ ] 8.1 `core/tokens.ts`：`estimateTokens(text)` → `ceil(总字符数 / 3.2)`（tech §7）
- [ ] 8.2 `estimateMessagesTokens(messages)` → 序列化所有消息后估算
- [ ] 8.3 会话累计：`Session` 维护 `cumulativeTokens`，每轮结束后 += 本轮估算（或 usage 精确值）
- [ ] 8.4 估算与精确混合：有 usage 的轮次用精确值，无 usage 的轮次用估算值（M1 主要走估算，usage 预留）
- [ ] 8.5 **L1 单测**：空文本 / 超长文本（100k+ 字符）/ 纯中文 / 纯英文 / 中英混合 / 仅空白字符——覆盖 tech §10 边界用例强制清单
- [ ] 8.6 **L1 单测**：会话累计（精确+估算混合求和、空会话=0）

**完成判据**：中英混合样例估算值在合理范围；累计逻辑正确。

## 9. 基础指令（对应 T1.9）

**目标**：FR-1.6 全局基础指令落地，开关可控，system 拼装正确，prompt 文本外置。

- [ ] 9.1 `prompts/directive-v1.md`：写入 DIRECTIVE_V1 完整文本（三条：完备性判断 / 缺失清单 / 不编造）（D11）
- [ ] 9.2 `core/directive.ts`：通过 `?raw` 导入 `directive-v1.md`，导出 `DIRECTIVE_V1` 常量与版本号；不内嵌 prompt 文本
- [ ] 9.3 设置·偏好页：基础指令开关（默认开），存 `at:uiPrefs.baseDirectiveEnabled`
- [ ] 9.4 LLM 客户端 system 拼装：`system = 角色提示词` +（开启时）`\n\n` + `DIRECTIVE_V1`（tech §6 / §8.1）
- [ ] 9.5 开关变更后下一次发送生效，不追溯已发生请求
- [ ] 9.6 **L1 单测**：拼装顺序（角色在前、指令在后）、开关关闭不追加、DIRECTIVE_V1 内容包含三条关键词、prompt 文件导入非空
- [ ] 9.7 **L2 单测**：开关持久化（fakeBrowser storage）

**完成判据**：开启时请求体末尾含完备性三条款；关闭后不再追加（抓包或日志核对）；prompt 文本在 `prompts/directive-v1.md` 中可独立编辑。

## 10. spec 归档（对应 T1.10）

**目标**：本目录三件套更新为已实现版，roadmap 回勾，变更记录追加。

- [ ] 10.1 本目录 requirements/plan/validation 三件套更新为"已实现"状态（勾选完成项、记录实际结果）
- [ ] 10.2 roadmap.md T1.1–T1.9 全部回勾为 `[x]`，T1.10 勾选
- [ ] 10.3 roadmap.md §10 追加一行 M1 变更记录
- [ ] 10.4 `CHROMEWEBSTORE.md` 确认权限说明已更新（storage 权限理由）
- [ ] 10.5 确认 `passWithNoTests` 已关闭（vitest.config.ts）

**完成判据**：roadmap M1 全部勾选，变更记录已追加，spec 目录状态为已实现。

---

## 执行顺序说明

严格按 1→2→3→4→5→6→7→8→9→10 执行（评审 D3）。其中：
- 任务 1（core+storage）是所有后续任务的底座，必须最先完成
- 任务 4（LLM 客户端）与任务 8（token 估算）为纯 infra/core，可在任务 2/3（设置 UI）并行思考但按序提交
- 任务 5（对话视图）依赖 1/2/3/4 全部就绪
- 任务 6（TokenStatusBar）依赖 8（估算函数）
- 任务 10（归档）在全部完成后执行
