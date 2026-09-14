# M1 · 侧边栏对话 MVP — Validation

> 依据 [roadmap.md §3](../../roadmap.md) M1 验收标准与 §1 DoD。
> 联调策略（评审 D4）：以 **DeepSeek** 为主路径跑通流式对话；roadmap 原列五家端点（智谱 GLM / OpenRouter / Kimi / 硅基流动）列为后续补验，不阻塞本里程碑合并。

## 1. 门禁（自动化）

| 命令 | 预期 | 结果 |
|---|---|---|
| `pnpm typecheck`（tsc --noEmit，strict） | 0 错误 | ✅ 2026-09-14 · 0 错误 |
| `pnpm lint`（eslint + prettier --check） | 0 违例 | ✅ 2026-09-14 · 0 违例 |
| `pnpm test`（vitest run） | 全部用例通过；`passWithNoTests` 已关闭 | ✅ 2026-09-14 · 268 用例全绿（含回声修复回归 6 例） |
| `pnpm build` | 构建成功，产物 `dist/chrome-mv3` | ✅ 2026-09-14 · 544.97 kB |

### 1.1 测试覆盖要求（roadmap §1 DoD 强制）

每个 T*.x 对应测试必须存在且通过：

| 任务 | 测试层级 | 必须覆盖的边界用例 |
|---|---|---|
| T1.1 core+storage | L1 + L2 | ID 生成、schema 迁移（未知版本报错）、storage round-trip、onChanged 回流 |
| T1.2 API 配置 | L1 + L2 | 字段校验（URL/必填/数值）、模型能力表匹配（精确/前缀/未命中）、思维强度映射构造、预填表命中、连接测试 401/404/超时 |
| T1.3 角色 | L1 + L2 | 默认角色 prompt 导入非空、seed 逻辑（空/非空）、恢复默认（缺失才补/已有不覆盖）、默认角色可删除、CRUD、复制 |
| T1.4 LLM 客户端 | L1 + L2 | SSE：正常流/[DONE]/断流/畸形 chunk/空 delta/reasoning 两种方言/多行 data；fetch：401/404/429/5xx/网络中断/abort；collectUsage 400→重试→缓存 |
| T1.5 对话视图 | L1（+L3 按需） | 消息组装顺序、Markdown 渲染 |
| T1.6 TokenStatusBar | L1（+L3 按需） | 阈值 69/70/71、89/90/91、达限禁发 |
| T1.7 会话列表 | L1 + L2 | 标题 20 字截断/空/空白、CRUD、持久化、排序 |
| T1.8 token 估算 | L1 | 空/超长 100k+/纯中文/纯英文/中英混合/仅空白、累计精确+估算混合 |
| T1.9 基础指令 | L1 + L2 | 拼装顺序、开关关闭不追加、DIRECTIVE_V1 三条款、开关持久化 |

## 2. 人工验收清单（可复现）

> 以下基于 roadmap M1 原文 7 条验收，联调端点调整为 DeepSeek 主路径（D4）。

### 2.1 配置与联调（roadmap 验收第 1 条，调整）

- [x] 配置一个 **DeepSeek** 端点（Base URL `https://api.deepseek.com/v1`，模型 `deepseek-chat`），30 秒内完成保存→连接测试→开始对话（2026-09-14 实测通过）
- [x] 连接测试按钮返回成功/失败反馈正确（HTTP 200 + 界面"✓ 连接成功"）
- [x] 思维强度设为"中"，抓包确认请求体含 `reasoning_effort: "medium"`（DeepSeek 方言）
- [ ] **后续补验（不阻塞合并）**：智谱 GLM（usage 精确）、OpenRouter（delta.reasoning）、Kimi（长上下文）、硅基流动（org/model）——持有 Key 后逐家验证

### 2.2 流式输出与渲染（roadmap 验收第 2 条）

- [x] 发送一条消息，流式输出首块 < 3 秒可见（本地网络）
- [x] 输出中包含表格/代码块时渲染正确（Markdown + 语法高亮）
- [x] 点击"停止生成"立即中断，已输出内容保留（2026-09-14 复验：点后停止按钮消失，4 秒后内容长度不变，已输出 845 字保留）
- [ ] 流式期间仅末条消息增量更新，不出现全列表闪烁

> **2026-09-14 验收记录（缺陷与修复）**：首轮真机验收发现本条前两项**不通过**——服务端流完整输出 793 字，应用只落库 550 字，中间缺块、结尾截断，代码块未渲染。根因是 storage 回流把自身写入的滞后回声当外部变更套用，把内存状态拉回旧快照（详见 [fix spec](../20260914-m1-fix-storage-echo/requirements.md) 与 ADR-010）。修复后复验：服务端 634 字与落库内容**逐字一致**（FNV 指纹 `e338fdbb` 相同）、含代码围栏、界面渲染出 `<pre><code>` 且 `hljs` 高亮生效、usage 精确回填（449/933/1382）。首块可见 < 3 秒亦在复验中确认。

### 2.3 故障处理（roadmap 验收第 3 条）

- [x] 网络不可达后发送：提示"网络连接失败，请检查网络或 Base URL 是否可访问"，不崩溃（以不可达域名 `atmate-unreachable.invalid` 触达与断网相同的网络错误分支；实测 `net::ERR_CONNECTION_CLOSED`）
- [x] 填错 API Key：提示"API Key 无效或无权限，请检查 Key 是否正确：Authentication Fails, Your api key: \*\*\*\*ance is invalid"（HTTP 401，且提示中 Key 已脱敏）
- [x] 填错 Base URL：提示"请求地址不存在，请检查 Base URL 和模型 ID 是否正确"（HTTP 404）+ 重试按钮
- [x] 三种故障后修正配置可重新发送（恢复正常配置后请求 200）

### 2.4 持久化（roadmap 验收第 4 条）

- [ ] 关闭浏览器再打开：会话列表、消息历史、角色、API 配置、激活项全部恢复（**待验收人手工执行**；扩展重载已验证数据完好）
- [x] API Key 在 UI 中脱敏显示（`••••`；错误提示中亦为 `****ance`）
- [x] storage.local 中可查到 `at:*` 键，数据结构与 tech §5 一致；且已落盘到 `Local Extension Settings/<扩展ID>/*.ldb`（leveldb 内含 `at:sessions` / `at:roles` / `at:apiConfigs` / `deepseek-chat` 等，证明重启可恢复）

### 2.5 Token 状态条（roadmap 验收第 5 条）

- [x] 状态条数字随每轮发送/接收更新（517 / 128,000；累计随会话累加）
- [x] 伪造 contextLimit=100（编辑配置），输入长文本触发达限：红条 + 发送按钮禁用 + 提示"上下文已满，无法发送更多消息"
- [x] 三段变色：<70% 常态色（`text-text-muted`）、70–89% 黄色（`text-warning` rgb 210,153,34，实测 517/650=79.5%）、≥90% 红色（`text-danger` rgb 248,81,73，实测 517/550=94%）
- [x] 数字前带"≈"标注，hover 可见估算口径说明（`title="按字符数估算，±15%"`）

### 2.6 思维强度映射（roadmap 验收第 6 条，修订）

- [x] 选择 DeepSeek 模型后，思维强度自动推荐 `reasoning_effort` 映射，level 下拉显示 low/medium/high
- [x] 选择一个不支持思维链的模型（如普通 gpt-3.5）后，思维强度开关**置灰（`disabled`）且强制取消勾选**，提示"该模型不支持思维链，思维强度已禁用"（D-013 定案实现，真机由验收人确认）
- [x] 手动切换为 custom 映射后，显示 JSON 模板编辑框，`{{level}}` 插值生效（模板框占位值为 `{"reasoning_effort":"{{level}}"}`，提示含 `{{level}}`；插值逻辑由 L1 单测覆盖）
- [x] 四档（关/轻/中/深）切换后，请求体 diff 符合映射定义（实测：关→请求体无该字段、轻→`"low"`、中→`"medium"`、深→`"high"`）：
  - `reasoning_effort` 模式：关→无字段，轻→`"low"`，中→`"medium"`，深→`"high"`
  - `budget_tokens` 模式：关→无字段，其余→`thinking: {type:"enabled", budget_tokens: N}`
- [x] 未命中能力表的模型显示通用四档 + custom 选项（以 `my-local-model` 验证）

### 2.7 基础指令（roadmap 验收第 7 条）

- [x] 基础指令开启（默认）时，抓包确认请求体 system 末尾含完备性三条款（完备性判断 / 缺失清单 / 不编造）
- [x] 关闭开关后，下一次发送的请求体不再追加基础指令（关闭后 system 只剩角色 prompt，411 字符，三条款关键词均不出现）
- [x] 开关状态持久化：切换即写入 `at:uiPrefs.baseDirectiveEnabled`（关→`false` 已确认）；重开窗口/扩展重载时由 storage 装载（浏览器重启形式见 §2.4 手工项）

### 2.8 角色与会话（补充验收，修订）

- [x] 首次启动有五个默认角色（在伴 Atmate/翻译官/摘要助手/代码审查员/学术解说员），system prompt 非空
- [x] 默认角色显示"默认"角标，但**可编辑、可删除**（与普通角色操作一致）：改名后角标保留，删除默认角色成功
- [x] 删除一个默认角色后，"恢复默认角色"按钮可将其补回（不覆盖其他已有角色）：删掉"学术解说员"→ 按钮出现 → 点击补回，且已改名的"翻译官"未被覆盖；补回后按钮再次隐藏
- [x] 所有角色均可复制为新角色（生成"… 副本"，`builtin: false`）
- [x] prompt 文本在 `prompts/roles/*.md` 中可独立查看和编辑，代码中无内嵌 prompt 字符串
- [x] 空对话直接发送使用默认角色「在伴 Atmate」（其 System Prompt 为产品介绍设定）；会话列表点"新建会话"仍可显式选择角色（D-013 定案实现，真机由验收人确认）
- [x] 会话可重命名、删除，删除当前会话后自动切换（重命名落库生效；删除提示"确定删除此会话？此操作不可撤销。"，删除后自动切到其他会话）
- [x] 会话标题自动取首条用户消息前 20 字（D-012 修复：标题走 `generateSessionTitle`，流式期间以 store 为准、不再重建会话对象；L1 用例覆盖，真机由验收人确认）

## 4. 验收发现的偏差与待办（2026-09-14）

> **2026-09-15 处理**：D-1/D-2/D-3 均已按 D-012/D-013 实现（见 decisionLog 与上方勾选），单测 273 全绿；真机复验待用户手工验收时一并确认。

| # | 类型 | 现象 | 证据 | 建议 |
|---|---|---|---|---|
| D-1 | **缺陷（待修）** | 会话标题未自动生成：首条用户消息发了多条会话，标题仍是"新对话"（首个会话为"新会话"） | `at:sessions` 4 条记录 title 均为默认值；`core/session.ts` 的 `generateSessionTitle` 有实现与单测，但 `ChatView` 走的是 `text.slice(0,20)`，且流式增量回调里 `updateSessionMessages` 在"闭包 sessions 中找不到该会话"分支用 `title ?? '新对话'` 重建会话对象，把首次写入的标题覆盖 | 修：流式路径改为复用同一会话对象/取当前 state 中的 title（并改用 `generateSessionTitle` 统一规则），补 L2/L3 回归用例 |
| D-2 | 偏差（待定） | 不支持思维链的模型：开关是"自动关闭 + 提示"，不是"置灰"；用户仍可手动开启 | 选 gpt-3.5-turbo 后 checkbox 未 disabled，点击可重新勾选并恢复映射下拉 | 二选一：实现改为 `disabled`，或把 spec 措辞改为"默认关闭并提示，可手动覆盖" |
| D-3 | 偏差（待定） | "新建会话时强制选择角色"：会话列表路径有角色选择；空对话直接发送则自动用第一个角色 | `ChatView.ensureSession()` 用 `roles[0]` | 二选一：发送前插入角色选择，或接受"默认第一个角色"并改 spec 措辞 |

## 3. 合并清单（Definition of Merged）

- [ ] plan.md 任务组 1–10 全部勾选
- [ ] roadmap.md T1.1–T1.10 已回勾，§10 追加 M1 变更记录
- [ ] requirements.md 无悬而未决的范围变更
- [ ] 三条门禁（typecheck / lint / test）全绿，`passWithNoTests` 已关闭
- [ ] 人工验收清单 §2.1–§2.8 主路径全部通过（DeepSeek 联调）
- [ ] manifest permissions 确认：`["sidePanel", "storage"]`，无意外新增
- [ ] `CHROMEWEBSTORE.md` 已同步 storage 权限理由
- [ ] 合并方式：分支合回 `main` 后删除分支；分支名与目录名一致（`20260914-m1-sidepanel-chat`）

## 4. 复现步骤（验收人按此走查）

1. `git checkout 20260914-m1-sidepanel-chat && pnpm install && pnpm build`
2. Chrome → `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `dist/chrome-mv3`
3. 点击工具栏图标打开侧边栏
4. 进入设置 → API 配置 → 新建 DeepSeek 配置（填入真实 Key）→ 连接测试 → 设为激活
5. 返回对话 → 新建会话选"翻译官" → 输入 "Hello, world!" → 发送 → 观察流式输出
6. 测试停止、断网、错 Key 等故障场景
7. 伪造 contextLimit=100 测试达限禁发
8. 关闭浏览器重开，确认数据持久化
9. 跑 `pnpm typecheck && pnpm lint && pnpm test` 确认门禁全绿

## 5. 后续补验跟踪（不阻塞合并）

| 端点 | 验证目标 | 状态 |
|---|---|---|
| 智谱 GLM | usage 精确模式返回 | ⬜ 待补 |
| OpenRouter | delta.reasoning 方言 | ⬜ 待补 |
| Kimi | 长上下文供给与限额治理 | ⬜ 待补（M2 后） |
| 硅基流动 | org/model 命名预填表 | ⬜ 待补 |

> 以上端点在用户持有对应 API Key 后，按 §4 步骤逐家验证；发现方言不兼容时走"先改 spec 再改码"流程追加修复。
