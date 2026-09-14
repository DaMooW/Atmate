# Roadmap（路线图）

> 版本：v0.5 · 2026-09-14 · 状态：定稿（评审通过）
> v0.5 变更（测试规范确立，2026-09-14）：§1 DoD 强化为"每个 T*.x 对应测试写完且通过才算完成"；各里程碑核心逻辑任务统一补测试标注；测试规范全文见 techniqueStack §10（四层金字塔 + L2 vi.mock + @webext-core/mocks）；新增 ADR-009。明细见 §10。
> v0.4 变更（评审定案，2026-09-13）：Q1 已决——定名"在伴 / Atmate"；T2.4 素材落点定案重写；M1 联调端点池五家入验收；M6 候选池增对照视图、一键直发；界面中英切换升为 M6 承诺项（T6.1–T6.4）。明细见 §10。
> v0.3 变更：采纳图像输入（D-010）——插入新 M4（图像输入），原 M4（精度与体验）与 M5（方向池）顺延为 M5/M6 并重编号任务；Q4/Q7 里程碑引用同步。
> v0.2 变更：信息缺口方案定案——FR-1.6 基础指令 + FR-2.5 上下文供给（tech §8）；工具层不做（ADR-007），重评条款入 M5；M1/M2/M3 任务相应扩充。
> 依据 [mission.md](mission.md)（范围）与 [techniqueStack.md](techniqueStack.md)（约束）。预估按"一名熟练开发者 + AI 辅助"计，单位人日。

## 0. 总览

| 里程碑 | 主题 | 交付要点 | 预估 | 依赖 |
|---|---|---|---|---|
| M0 | 工程初始化 | WXT 脚手架、门禁、空壳入口 | 1 | — |
| M1 | 侧边栏对话（MVP） | 手动输入 + 流式输出 + API/角色/token 基础 | 6–8 | M0 |
| M2 | 划词集成 | 浮动按钮 + 右键菜单 + 素材卡片 + 上下文供给 | 3–4 | M1 |
| M3 | PDF 支持 | 自建查看页接管 + PDF 划词 + 附全文档 | 4–6 | M2 |
| M4 | 图像输入 | vision 开关 + 右键图片/供给附图/PDF 页图 + 图片 token | 4–6 | M2（网页侧）· M3（PDF 侧） |
| M5 | 精度与体验 | usage 精确计量、超限治理、reasoning 展示、导出等 | 4–6 | M1；剥离图片项依赖 M4 |
| M6 | 打磨与方向 | 中英切换（i18n，承诺项）；候选池按需（角色分享、对照视图、一键直发等） | 1–2（i18n）·其余按需 | M5 |

原则：**每个里程碑独立可演示**；M1 结束即有一个“可用的纯对话扩展”，M2 结束即兑现产品灵魂（划词链路），M4 结束即覆盖网页与 PDF 的图像常态（D-010）。

## 1. 开发流程约定（spec-first）

1. 每个里程碑开工前，先产出 `specs/<YYYYMMDD>-<slug>/` 目录（自 M0 起取代单文件 spec；目录名与分支名一致），三件套：
   - `requirements.md` —— 背景、范围（引用 FR/NFR 编号）、关键决策、上下文与约束（含数据与接口变更、边界与异常）；
   - `plan.md` —— 一系列编号任务组，与本文 T*.x 一一对应，完成即勾选；
   - `validation.md` —— 交互稿要点、可复现验收清单与合并判据。
   六段骨架与模板见 `specs/TEMPLATE.md`；首个实例为 `specs/20260913-m0-init/`。
2. spec 评审通过（口头/留言均可）才动代码；实现中发现偏差，**改 spec 再改码**。
3. 每个里程碑的 DoD：
   - 验收清单全绿；
   - 门禁通过（`tsc` / `eslint` / `vitest`）；
   - **测试完成定义（强制）**：每个勾选的 T*.x 任务，其对应测试必须已写完且 `pnpm test` 全绿，否则不得勾选、不得提交。测试分层与规范见 techniqueStack §10（四层金字塔：L1 core 纯函数单测 / L2 infra  vi.mock + mockBrowser / L3 组件 jsdom / L4 E2E 后期）；核心模块必须覆盖边界用例（空选区、超长文本、断流、畸形 chunk、损坏图片、schema 迁移等，清单见 tech §10）。
   - 本文件勾选对应任务并在文末追加变更记录（一行）。

## 2. M0 · 工程初始化（1 人日）

**目标**：`pnpm dev` 出一个空 sidepanel + background + content 骨架，门禁齐备。

- [x] T0.1 WXT + React + TS 脚手架；入口：sidepanel/background/content（viewer、options 留桩）
- [x] T0.2 Tailwind v4 接入；深浅色 token（颜色变量）
- [x] T0.3 门禁三件套跑通并接入 package.json scripts（本地 pre-commit 即可，CI 暂缓）
- [x] T0.4 空壳组件层级（tech §4）：App/Sidebar/Main 占位
- [x] T0.5 `specs/` 目录 + 模板文件落地；仓库 `git init` 与 README（一段话 + 四文档链接）

**验收**：Chrome 114+ 加载未打包扩展，能看到空 sidepanel；改代码 HMR 生效；三条门禁命令全绿。

## 3. M1 · 侧边栏对话 MVP（6–8 人日）

**范围**：FR-3 全部；FR-1.1–1.4；FR-2.3；FR-4 全部（除 extraBody/温度）；FR-5.1–5.2（估算模式）；FR-6 全部。此阶段无 content script，素材靠手动粘贴。

- [x] T1.1 core 域层 + storage 同步层（tech §5 schema 落地；含 nanoid、schemaVersion 迁移骨架）＋单测
- [x] T1.2 设置视图·API 配置：列表/新建/编辑/删除/切换激活；字段校验；思维强度三映射（reasoning_effort / budget_tokens / custom 模板+{{level}} 插值）；contextLimit 预填表；连接测试按钮
- [x] T1.3 设置视图·角色：CRUD + 内置示例角色；新建会话时选择角色
- [x] T1.4 llm 客户端：请求构造（tech §6）、SSE 解析、停止（AbortController）、错误分类中文提示；collectUsage 探测降级；**单测（断流/畸形 chunk/空 delta）**
- [x] T1.5 对话视图：消息流、末条增量渲染、Markdown+高亮、发送/停止
- [x] T1.6 TokenStatusBar：估算（tech §7）、三段变色、达限禁发红条
- [x] T1.7 会话列表：切换/重命名/删除/持久化；标题自动生成
- [x] T1.8 Token 估算 + 会话累计 in core，**单测（中英混合样例）**
- [x] T1.9 基础指令（FR-1.6）：`DIRECTIVE_V1` 常量 + 设置开关（默认开）+ system 拼装（tech §6/§8.1）；单测（拼装顺序、开关关闭不追加）
- [x] T1.10 spec `specs/20260914-m1-sidepanel-chat/` 归档为已实现版

**验收**（全部可复现勾选）：
- [ ] 配置一个真实 OpenAI 兼容端点，30 秒内完成保存→测试→开始对话（联调端点池 · 2026-09-13 定：DeepSeek 验 reasoning_content；智谱 GLM 验 usage 精确模式；OpenRouter 验 `delta.reasoning` 方言；Kimi 验长上下文供给与限额治理；硅基流动验 `org/model` 命名——预填表收录）
- [ ] 流式输出首块可见；表格/代码块渲染正确；“停止生成”立即生效
- [ ] 断网/错 Key/错 URL 三种故障各有明确中文提示且不崩
- [ ] 关闭再打开浏览器：会话、角色、配置、激活项全部恢复
- [ ] 状态条数字随每轮更新；伪造 contextLimit=100 触发达限禁发
- [ ] 思维强度四档产生的请求体 diff 人工核对符合映射定义
- [ ] 基础指令开启时请求体末尾含完备性三条款；关闭开关后立即不再追加（tech §8.1）

## 4. M2 · 划词集成（3–4 人日）

**范围**：FR-2.1/2.2、FR-2.5（网页侧）、FR-7.1/7.2。content script 上线，打通产品灵魂链路。

- [ ] T2.1 content script：selectionchange 去抖；选区有效性判定（可编辑元素/输入框内选区不弹浮层）；**单测（选区判定纯函数：输入框内/可编辑元素/普通段落/空选区）**
- [ ] T2.2 浮动按钮：Shadow DOM、跟随选区定位、防溢出；点击 → sidePanel.open + 消息携带 {text, title, url}
- [ ] T2.3 右键菜单“发送选中内容到 AI 侧边栏”（selection 上下文）
- [ ] T2.4 面板接收：素材卡片（来源角标 + 原文可编辑 + 补充输入 + 采用/丢弃）；落点定案（2026-09-13）：默认进当前激活会话——卡片顶部常显"将发送至：<会话名>"并支持一键转新会话；无激活会话则直接新建，不弹确认
- [ ] T2.5 消息链路容错：面板未开时点击（冷启动竞态）、同 Tab 重复发送、超长选区（> N 字提示截断）
- [ ] T2.6 上下文供给·网页侧（FR-2.5）：仅选区 / ±相邻段落 / 附整页正文三档采集（tech §8.2）；素材卡片分栏展示；readability 失败降级显著标注；token 预览联动（FR-5）；**单测（三档组装纯函数 + 截断边界 + 失败降级标注）**
- [ ] T2.7 spec `specs/M2-selection.md` 归档

**验收**：
- [ ] 在 5 个风格迥异的站点（含 GitHub、带 Dark 主题站、Google Docs 之外的富文本编辑器）划词，浮层定位正确、不受站点样式影响
- [ ] 点击浮层 < 300ms 面板前置且素材卡片就位；右键菜单同效
- [ ] 编辑原文/补充说明会体现在最终请求体（日志核对）
- [ ] 输入框、地址栏场景不误触发
- [ ] 三档上下文供给的实发请求体与素材卡片预览一致（含“整页提取失败降级”的标注场景）

## 5. M3 · PDF 支持（4–6 人日）

**范围**：FR-2.4，FR-2.5（附全文档），tech §9。前置认知：这是平台限制下的“接管”方案，不是注入原生查看器。

- [ ] T3.1 viewer 入口：pdf.js 动态加载，加载 PDF（http/https、file:// 需引导开启文件访问）
- [ ] T3.2 PDF 导航接管：webNavigation 探测 + 一次性选择弹窗（扩展查看页 / 原生 + 记住选择），设置页有总开关
- [ ] T3.3 viewer 内划词复用 M2 链路（selectionchange 在扩展页同机制）
- [ ] T3.4 来源标注：素材卡片显示 `pdf://文件名/页码`（页码定位尽力而为）
- [ ] T3.5 大 PDF（>20MB、>500 页）性能验证；懒加载页面
- [ ] T3.6 “附 PDF 全文”档（FR-2.5）：viewer 全文供给 + 大文档截断策略（tech §8.2）；**单测（>50 页截断逻辑 + 页码标注 + 空文档）**
- [ ] T3.7 spec `specs/M3-pdf.md` 归档

**验收**：
- [ ] 打开在线 PDF 与本地 file:// PDF，两种方式均能划词发送并收到输出
- [ ] 选择“继续用 Chrome 原生查看器”后不再弹窗且功能诚实标注不可用
- [ ] 接管开关关闭后一切回落到 M2 行为

## 6. M4 · 图像输入（4–6 人日）

**范围**：FR-2.6 全部、FR-4.6、FR-5.5（D-010）。前提：消息模型 parts 化（schema v2）与 vision 模型；网页侧依赖 M2，PDF 侧依赖 M3。

- [ ] T4.1 schema v2：ChatMessage 内容分段化（text / image 引用分离）；图片二进制入 IndexedDB（at:images），消息存 imageId；storage 迁移 v1→v2 + 单测
- [ ] T4.2 vision 开关（FR-4.6，默认关）；素材含图未开启 → 红条禁发与引导文案
- [ ] T4.3 入口·右键图片：context type `image`，上报 srcUrl/alt/来源页；side panel 归一化管线（tech §6：fetch→bitmap→降采样长边 1568px→JPEG 0.85→data URL）+ **单测（损坏字节、超长边）**
- [ ] T4.4 入口·供给附图：nearby/page 档位采集 `currentSrc`，单次 ≤4 张；素材卡片缩略图 + 逐张移除 + alt/figcaption 文本化
- [ ] T4.5 入口·PDF 页图：viewer “附当前页为图片”（DPR×2 渲染）；框选区域截图【加分】
- [ ] T4.6 图片 token 估算（≈(宽×高)/750，标 ≈）接入 TokenStatusBar 与素材预览；精确模式由 usage 覆盖
- [ ] T4.7 Composer 粘贴图片【加分】
- [ ] T4.8 spec `specs/M4-images.md` 归档

**验收**：
- [ ] 配置 vision 模型（候选：GLM-4V / OpenRouter 任一 vision 端点），在 3 类风格迥异站点右键图片发送，模型能正确转述图中文字与结构
- [ ] 扫描版 PDF（无文字层）“附当前页”发送，回答内容确实来自页面图
- [ ] 素材卡片逐张移除图片后，实发请求体与预览完全一致（日志核对）
- [ ] vision 关闭时含图素材被拦截且提示明确；勾选开启后同素材可发
- [ ] 图片 token 计入状态条并带 ≈；单次附图上限 4 张触发时 UI 明确提示

## 7. M5 · 精度与体验（4–6 人日)

**范围**：把“能用的 MVP”打磨为“可信可长期使用”。

- [ ] T5.1 usage 精确模式：接入点按 FR-5.2 全量替换估算；估算仅兜底并带“≈”角标与口径 hover；**单测（精确/估算混合累计 + 无 usage 降级标记）**
- [ ] T5.2 超限治理：≥90% 引导条 + “压缩历史”一键（用当前模型把旧消息摘要为一段 system 备注，附撤销）；支持把早期图片剥离为占位文本（M4 引入的图像消息）
- [ ] T5.3 reasoning 展示：折叠面板默认收起，统计其 token（若用量影响计费则单列）
- [ ] T5.4 单条消息 token 分解（FR-5.4）与失败重试/单条重新生成（FR-3.3）
- [ ] T5.5 估算校准（全局系数 + 一次账单反推；一并校准图片 token 公式）（tech §7.3）；**单测（系数覆盖 + 账单反推计算 + 图片公式校准）**
- [ ] T5.6 会话导出 Markdown / 角色 JSON 导入导出（FR-1.5）
- [ ] T5.7 快捷键：唤起面板、聚焦输入、发送（chrome.commands）
- [ ] T5.8 温度、extraBody 字段补全（FR-4.2 加分项）
- [ ] T5.9 spec `specs/M5-refinement.md` 归档

**验收**：
- [ ] 精确模式下状态条与 API usage 完全一致（对同一轮请求）
- [ ] 压缩历史后可继续对话且不超限；撤销能还原
- [ ] 含图会话压缩后，早期图片替换为占位文本，实发请求体不含对应 data URL
- [ ] 导出的会话 md 在任何 markdown 阅读器中排版正常
- [ ] 全键盘流（唤起→选区确认→发送）无鼠标可行

## 8. M6 · 打磨与方向（1–2 人日·承诺项 + 按需候选池）

**承诺项：界面中英切换**（2026-09-13 定案；原 M6 "i18n" 候选升为承诺，NFR-6 同步收紧）

- [ ] T6.1 `uiPrefs.locale`（'zh-CN' 默认 / 'en-US'）+ 设置·偏好页语言切换；切换即时生效（ADR-006 onChanged 广播，无需重载）
- [ ] T6.2 全量文案字典化（tech 选型 #10）：界面文案 + 错误分类提示（NFR-4）+ 时间/数字 Intl 本地化；内置四角色的名称/描述/提示词提供中英双份，用户自建角色不译
- [ ] T6.3 字典完整性由类型保证：缺 key 是编译错误，两种语言下门禁全绿
- [ ] T6.4 spec `specs/M6-i18n.md` 归档

**验收**：切换后全部界面文案与错误提示即时变为英文、无中文残留，切回同理；重开浏览器语言选择保持（存 `uiPrefs.locale`）。

**候选池**（不承诺，届时按使用反馈排序；i18n 已移出入此列）：角色分享市场（外部 JSON 即可）· 译文/解读对照视图（原文与 AI 输出并排展示，研读长文不回滚）· 一键直发快捷通道（划词越过素材卡片直发：固定默认角色 + 仅选区档，全局默认关；与"无黑箱"透明原则有张力，入选须先解决取舍——2026-09-13 评审） · Anthropic 原生协议第二实现（ADR-003 的再评估）· 受限工具层（read_source_page / open_url + 确认卡，仅当使用反馈证明 FR-1.6+FR-2.5 不够用，ADR-007 重评条款）· `optional_host_permissions` 化（开放问题 Q5）· 上架 Chrome Web Store 流程 · 更新通知。**候选池各项不承诺进入实现**，先进 spec 评审。

## 9. 开放问题（Owner: 产品/用户决策）

| # | 问题 | 影响 | 默认倾向 |
|---|---|---|---|
| Q1 ✅已决 | 产品正式名（2026-09-13） | 品牌/商店 | 中文名**在伴**，英文 wordmark **Atmate**（at+mate 镜像"在伴"）；未联网查重，上架前自查 |
| Q2 | PDF 接管的默认值（默认询问/默认接管/默认原生） | M3 首次体验 | 默认询问（现方案） |
| Q3 | API Key 是否本地加密（加口令，代价：每次输入口令） | M1 后任何时点 | 暂不加密（ADR-004） |
| Q4 | 引入浏览器端 BPE 分词库替换字符/图片系数估算（准确↑ 体积+数百 KB） | M5 | 先校准系数（含图片公式），分词库进 M6 评估 |
| Q5 | `<all_urls>` 是否改 optional_host_permissions（商店审核友好 vs 配置体验） | 上架前 | 个人用保持现状，上架时再议 |
| Q6 | 会话数据量上限与自动清理策略（storage.local 10MB） | M5 | 单会话消息数软上限 + 提醒，暂不自动删 |
| Q7 | 思维链是否计入“会话累计 token”（各家计费不一） | M5 | 不计入，单列展示 |

## 10. 变更记录

| 日期 | 里程碑 | 变更 |
|---|---|---|
| 2026-09-12 | — | v0.1 初稿（与需求方确认：侧边栏+划词 / OpenAI 兼容 / 多轮会话 / TS+React+Vite(WXT)） |
| 2026-09-13 | — | v0.2：信息缺口讨论定案——采纳 L0：FR-1.6 基础指令（完备性声明+缺失清单+不编造）与 FR-2.5 上下文供给（选区±段落/整页/PDF 全文）；工具层不做（ADR-007），重评条款入 M6 候选池；M1/M2/M3 任务相应扩充 |
| 2026-09-13 | — | v0.3：采纳图像输入（D-010）——FR-2.6/FR-4.6/FR-5.5/场景 E/S-5；插入新 M4（图像输入），原 M4/M5 顺延为 M5/M6 并重编号（T4.x→T5.x）；Q4/Q7 里程碑引用同步 |
| 2026-09-13 | — | v0.4（评审定案）：定名"在伴 / Atmate"（Q1 已决，未联网查重、上架前自查）；素材落点默认当前会话·一键转新·无激活即新建（T2.4 重写）；M1 联调端点池五家入验收（含硅基流动 `org/model` 预填表收录）；M6 候选池增对照视图与一键直发（附"无黑箱"张力注记）；界面中英切换由候选升为承诺项（T6.1–T6.4，NFR-6 收紧，tech 选型 #10） |
| 2026-09-13 | M0 | 工程初始化交付（T0.1–T0.5 全绿）：WXT 0.21 + React 18 + TS strict 脚手架，sidepanel/background/content 三入口（viewer、options 留桩）；Tailwind v4 语义 token（跟随系统深浅色，切换交互留后续）；门禁三件套接入 scripts + 本地 pre-commit（simple-git-hooks + lint-staged）；App/Sidebar/Main 空壳层级；`specs/` 模板与 README 落地。规格与验收：`specs/20260913-m0-init/` |
| 2026-09-13 | M0 | spec 修订（验收期发现，D8）：追加"侧边栏入口触发"——manifest 增 `action`、background 注册 `action.onClicked` → `sidePanel.open({ windowId })`。原因：只声明 `side_panel.default_path` 并不会让面板可打开，"能看到空 sidepanel"此前只能靠 Chrome 侧边栏自带的下拉；不新增任何权限。明细见 `specs/20260913-m0-init/` 修订记录 |
| 2026-09-13 | M0 | spec 修订（用户反馈，D9）：追加"扩展图标"——生成 16/32/48/128 真实 PNG（`scripts/generate-icons.mjs`，纯 Node 无新依赖），manifest 声明 `icons` + `action.default_icon` + `action.default_title`。原因：无图标时扩展显示为通用占位块，用户"装上了但认不出来"；不新增权限。明细见 `specs/20260913-m0-init/` |
| 2026-09-13 | M0 | spec 修订（用户反馈，D10）：构建产物目录由隐藏的 `.output/` 改为非隐藏的 `dist/`（`outDir`）。原因：点开头目录在访达与"加载已解压的扩展程序"选择框里都看不到，用户无法选到产物；不改 manifest 与权限。明细见 `specs/20260913-m0-init/` |
| 2026-09-14 | — | v0.5：测试规范确立——§1 DoD 强化为"每个 T*.x 对应测试写完且通过才算完成，否则不得勾选/提交"；M2 T2.1/T2.6、M3 T3.6、M5 T5.1/T5.5 补测试标注；测试规范全文入 techniqueStack §10（四层金字塔 L1 core / L2 infra vi.mock+mockBrowser / L3 组件 jsdom / L4 E2E 后期，含目录约定与边界用例强制清单）；新增 ADR-009；`vitest.config.ts` 扩展 include 支持 .tsx 并注明组件测试环境切换方式。spec：`specs/20260914-testing-policy/` |
| 2026-09-14 | M0 | M0 测试回溯补齐——v0.5 测试规范确立后，回溯补齐 M0（T0.1–T0.5）的测试覆盖：提取 `scripts/generate-icons.mjs` 纯函数为 `scripts/icon-engine.mjs`（+ `.d.mts` 类型声明），写 L1 单测 25 例（insideRoundRect/insideTriangle/crc32/encodePng/render，含边界）；L2 background 行为测试 3 例（用 `vi.stubGlobal` + WXT 内置 `wxt/testing/fake-browser`，验证点击图标→sidePanel.open 与失败路径）；manifest 配置验证 8 例（权限最小化/action 无 default_popup/icons 四尺寸/outDir）；smoke 升级为项目结构检查 4 例。合计 40 用例全绿。同时发现 git 中原始图标过时（代码微调后未重新生成），已更新为当前脚本产物。关键发现：WXT entrypoints 的 `browser`/`defineBackground` 是全局注入，需用 `vi.stubGlobal` 而非 `vi.mock`（techniqueStack §10 待修正）。spec：`specs/20260914-m0-tests/` |
| 2026-09-14 | — | 文档修正：techniqueStack §10 L2 mock 方案——原写 `vi.mock('wxt/browser')` + `@webext-core/mocks` 的 `mockBrowser`，M0 测试实战发现两处偏差：(1) `@webext-core/mocks` npm 包不存在，正确的是 WXT 内置 `wxt/testing/fake-browser` 导出 `fakeBrowser`（re-export `@webext-core/fake-browser`），无需单独装包；(2) WXT entrypoints 的 `browser`/`defineBackground` 是全局注入，必须用 `vi.stubGlobal` + 动态 import + `vi.resetModules()`，`vi.mock` 只适用于显式 import `wxt/browser` 的 infra 模块。同步修正 §1 选型 #11、§12 ADR-009、AGENTS.md；补充 fake-browser API 要点（事件 `.trigger()`、方法 `vi.spyOn`）。spec：`specs/20260914-fix-l2-mock-doc/` |
| 2026-09-14 | M1 | 侧边栏对话 MVP 交付（T1.1–T1.10 全绿）：core 域层（types/id/schema/defaults/modelCapabilities/contextLimits/validation/thinking/builtinRoles/directive/systemPrompt/tokens/session）+ storage 同步层（zustand + onChanged 回流 + 默认角色 seed）+ infra/llm 客户端（requestBuilder/sseParser/errors/client，含 collectUsage 探测降级）+ UI（设置视图 API配置/角色/偏好三 tab、对话视图 MessageList/MessageItem/Composer/ChatView、TokenStatusBar、SessionList）+ prompts 外置（roles/*.md + directive-v1.md，?raw 导入）。测试 262 例全绿（L1 core ~60% + L2 infra ~20%），构建 544 kB。关键决策：思维强度用模型能力预填表（非动态 API）、默认角色 seed 后可编辑删除、prompt 全部外置不内嵌、token 估算用 ceil(字符数/3.2) 混合系数。spec：`specs/20260914-m1-sidepanel-chat/` |
| 2026-09-14 | M1 | 验收缺陷修复：storage 回流把自身写入的**滞后回声**当外部变更套用，导致流式输出丢字（服务端 793 字 → 落库 550 字，代码块未渲染）。改为写入登记稳定指纹（键序规范化）、回流命中即忽略（ADR-010）；L2 测试 +6 例（268 全绿）；真机复验落库与服务端**逐字一致**（634 字同指纹、含代码围栏与 usage）。spec：`specs/20260914-m1-fix-storage-echo/` |
