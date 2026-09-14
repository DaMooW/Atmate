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

- [ ] 配置一个 **DeepSeek** 端点（Base URL `https://api.deepseek.com/v1`，模型 `deepseek-chat`），30 秒内完成保存→连接测试→开始对话
- [ ] 连接测试按钮返回成功/失败反馈正确
- [ ] 思维强度设为"中"，抓包确认请求体含 `reasoning_effort: "medium"`（DeepSeek 方言）
- [ ] **后续补验（不阻塞合并）**：智谱 GLM（usage 精确）、OpenRouter（delta.reasoning）、Kimi（长上下文）、硅基流动（org/model）——持有 Key 后逐家验证

### 2.2 流式输出与渲染（roadmap 验收第 2 条）

- [x] 发送一条消息，流式输出首块 < 3 秒可见（本地网络）
- [x] 输出中包含表格/代码块时渲染正确（Markdown + 语法高亮）
- [x] 点击"停止生成"立即中断，已输出内容保留（2026-09-14 复验：点后停止按钮消失，4 秒后内容长度不变，已输出 845 字保留）
- [ ] 流式期间仅末条消息增量更新，不出现全列表闪烁

> **2026-09-14 验收记录（缺陷与修复）**：首轮真机验收发现本条前两项**不通过**——服务端流完整输出 793 字，应用只落库 550 字，中间缺块、结尾截断，代码块未渲染。根因是 storage 回流把自身写入的滞后回声当外部变更套用，把内存状态拉回旧快照（详见 [fix spec](../20260914-m1-fix-storage-echo/requirements.md) 与 ADR-010）。修复后复验：服务端 634 字与落库内容**逐字一致**（FNV 指纹 `e338fdbb` 相同）、含代码围栏、界面渲染出 `<pre><code>` 且 `hljs` 高亮生效、usage 精确回填（449/933/1382）。首块可见 < 3 秒亦在复验中确认。

### 2.3 故障处理（roadmap 验收第 3 条）

- [ ] 断网（关闭 Wi-Fi）后发送：明确中文提示"网络连接失败"，不崩溃
- [ ] 填错 API Key：提示"API Key 无效或无权限"（401/403）
- [ ] 填错 Base URL：提示"Base URL 或模型 ID 有误"（404）
- [ ] 三种故障后恢复网络/修正配置可重新发送

### 2.4 持久化（roadmap 验收第 4 条）

- [ ] 关闭浏览器再打开：会话列表、消息历史、角色、API 配置、激活项全部恢复
- [ ] API Key 在 UI 中脱敏显示（`••••`）
- [ ] storage.local 中可查到 `at:*` 键，数据结构与 tech §5 一致

### 2.5 Token 状态条（roadmap 验收第 5 条）

- [ ] 状态条数字随每轮发送/接收更新
- [ ] 伪造 contextLimit=100（编辑配置），输入长文本触发达限：红条 + 发送按钮禁用
- [ ] 三段变色：<70% 常态色、70–89% 黄色、≥90% 红色
- [ ] 数字前带"≈"标注，hover 可见估算口径说明

### 2.6 思维强度映射（roadmap 验收第 6 条，修订）

- [ ] 选择 DeepSeek 模型后，思维强度自动推荐 `reasoning_effort` 映射，level 下拉显示 low/medium/high
- [ ] 选择一个不支持思维链的模型（如普通 gpt-3.5）后，思维强度开关置灰并提示"该模型不支持思维链"
- [ ] 手动切换为 custom 映射后，显示 JSON 模板编辑框，`{{level}}` 插值生效
- [ ] 四档（关/轻/中/深）切换后，请求体 diff 符合映射定义：
  - `reasoning_effort` 模式：关→无字段，轻→`"low"`，中→`"medium"`，深→`"high"`
  - `budget_tokens` 模式：关→无字段，其余→`thinking: {type:"enabled", budget_tokens: N}`
- [ ] 未命中能力表的模型显示通用四档 + custom 选项

### 2.7 基础指令（roadmap 验收第 7 条）

- [ ] 基础指令开启（默认）时，抓包确认请求体 system 末尾含完备性三条款（完备性判断 / 缺失清单 / 不编造）
- [ ] 关闭开关后，下一次发送的请求体不再追加基础指令
- [ ] 开关状态持久化（关闭重开保持）

### 2.8 角色与会话（补充验收，修订）

- [ ] 首次启动有四个默认角色（翻译官/摘要助手/代码审查员/学术解说员），system prompt 非空
- [ ] 默认角色显示"默认"角标，但**可编辑、可删除**（与普通角色操作一致）
- [ ] 删除一个默认角色后，"恢复默认角色"按钮可将其补回（不覆盖其他已有角色）
- [ ] 所有角色均可复制为新角色
- [ ] prompt 文本在 `prompts/roles/*.md` 中可独立查看和编辑，代码中无内嵌 prompt 字符串
- [ ] 新建会话时强制选择角色
- [ ] 会话可重命名、删除，删除当前会话后自动切换
- [ ] 会话标题自动取首条用户消息前 20 字

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
