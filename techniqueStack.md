# Technique Stack（技术栈与架构）

> 版本：v0.5 · 2026-09-14 · 状态：定稿（评审通过）
> v0.5 变更（测试规范确立，2026-09-14）：选型总表增 #11 测试工具；§10 工程化扩充完整测试规范（四层金字塔、L2 vi.mock + @webext-core/mocks、目录与环境约定、边界用例强制清单）；新增 ADR-009。roadmap §1 DoD 同步强化。
> v0.4 变更（评审定案，2026-09-13）：产品定名"在伴 / Atmate"——`at:` 键前缀与 IDB 库名 `at` 恰合 Atmate 缩写，沿用免迁移；模型预填表纳入聚合站 `org/model` 命名（§7）；界面中英切换定案——自研 typed 字典（§1 选型 #10）+ `uiPrefs.locale`（§5）。
> v0.3 变更：图像输入（D-010）——消息模型 parts 化、`ApiConfig.vision`、图片归一化管线、IndexedDB 分置存储、图片 token 公式（§5/§6/§7/§8.2），权限 +`unlimitedStorage`；新增 ADR-008。
> v0.2 变更：新增"基础指令"与"上下文供给"设计（§5/§6/§8 新增内容，风险表与 ADR-007 同步）；详见各节。
> 需求来源 [mission.md](mission.md)；本文约束"怎么做"：选型、架构、数据模型、难点对策。最终排期见 [roadmap.md](roadmap.md)。

## 1. 选型总表

| # | 决策点 | 选择 | 核心理由 | 落选者及原因 |
|---|---|---|---|---|
| 1 | 扩展构建框架 | **WXT**（wxt.dev） | 一等公民支持 MV3 + 多入口（sidepanel / content / background / 自定义页），自动生成 manifest、HMR、按目标浏览器打包；2026 年社区主流 | CRXJS（维护放缓）；纯手写 manifest（多入口维护成本高） |
| 2 | 语言 | **TypeScript**（strict） | 配置对象/存储 schema 必须有类型守护 | — |
| 3 | UI 框架 | **React 18** | 生态与可参考组件最多 | Svelte（生态小） |
| 4 | 状态管理 | **zustand** | 轻量；便于与 chrome.storage 写"storage 为唯一真相源"的同步层 | Redux（样板多） |
| 5 | 样式 | **Tailwind CSS v4** | 窄面板快速布局；深浅色主题用 dark: 变体 | CSS Modules（写得慢） |
| 6 | Markdown 渲染 | **react-markdown + remark-gfm + rehype-highlight** | 流式部分文档重渲染成本低；高亮开箱即用 | 自写解析器 |
| 7 | 持久化 | **chrome.storage.local** | 无云同步面，API Key 不出本机（NFR-2） | storage.sync（会把 Key 同步上云） |
| 8 | LLM 调用发起位置 | **扩展页面（sidepanel / PDF 页）内 fetch** | 规避 MV3 Service Worker ~30s 空闲生命周期对流式长连接的杀进程风险 | background 发起（需额外 keep-alive，复杂且脆） |
| 9 | 打包/包体 | Vite（WXT 内置） | — | — |
| 10 | 界面 i18n（中英切换，M6） | **自研轻量字典**：`locales/zh-CN.ts` · `en-US.ts` + `useT()` hook | UI 文案量级小（数百条）、零运行时依赖；typed dictionary 缺 key 即编译错误 | i18next（生态标准但本项目体量用不上）；chrome.i18n `_locales`（绑定浏览器语言、与 React 侧文案两套体系） |
| 11 | 测试框架与分层 | **vitest**（单测）+ **@webext-core/mocks**（`mockBrowser` 批量 mock chrome API）+ **@testing-library/react**（组件测试，M1 后引入）+ **Playwright**（E2E，M3 后引入） | vitest 与 Vite/WXT 同构零配置；`mockBrowser` 覆盖 storage/runtime/sidePanel 等全部用到的 API，避免手写字段遗漏；组件测试等交互稳定后再加；E2E 只覆盖关键路径冒烟 | Jest（需额外配 TS/ESM）；手动 mock chrome API（字段易遗漏、维护成本高）；Puppeteer（扩展加载支持不如 Playwright 直观） |

## 2. 架构总览

```
┌────────────────────────── Chrome Extension (MV3, WXT) ──────────────────────────┐
│                                                                                │
│  [Side Panel]  React SPA（主界面）                                               │
│   ├─ 视图：会话列表 / 对话流 / 设置(API·角色·偏好)                                 │
│   ├─ 素材卡片：选区/图片 + 补充 + token 预览 → 拼装消息                            │
│   ├─ Token 状态条：上下文 ≈x/y · 会话累计                                        │
│   └─ LLM Client：构造请求 → fetch(SSE) → 增量分发到 UI                            │
│                                                                                │
│  [Content Script]  注入普通网页                                                   │
│   ├─ 监听 selectionchange → 显示浮动按钮(Shadow DOM) → 携带选区消息              │
│   └─ 上下文供给采集(§8.2)：选区±段落 / 整页正文(readability)，随选区一并上报    │
│                                                                                │
│  [PDF Viewer Page]  chrome-extension://…/viewer.html（M3）                       │
│   └─ pdf.js 渲染 + 同一套划词链路（页面即"普通网页"）                              │
│                                                                                │
│  [Background Service Worker]  薄路由层                                           │
│   ├─ 注册右键菜单（文字 + 图片）；协助 chrome.sidePanel.open()                    │
│   └─ 消息中继与存储代理（无业务状态，可随时被杀重启）                                │
│                                                                                │
└──────────────────────────────── chrome.storage.local + IndexedDB(at) ────────────┘
   at:meta(v) · at:apiConfigs · at:roles · at:sessions · at:uiPrefs · images(IDB)
```

数据流（一次划词）：
`Content Script 捕获选区 → runtime.sendMessage → Background 中继 → sidePanel 置于前台并收到素材 → 用户补充/编辑 → LLM Client 发起流式请求 → 增量渲染 + 采集 usage → 落盘 storage`。

## 3. Manifest 与权限

- `permissions`：`sidePanel`、`contextMenus`、`storage`、`unlimitedStorage`（图片等二进制走 IndexedDB，免配额焦虑，D-010）。
- `host_permissions`：`<all_urls>`。
  - 用途有三：① 从扩展页面直接 fetch 任意用户自配 Base URL（跨域）；② PDF 页取文件字节；③ 图片归一化时取回页面图片（§6，D-010）。这是本产品唯一"重"权限，代价是安装时提示"读取所有网站数据"。
  - 不采用"让用户手填域名白名单"方案：Base URL 千差万别、随时可改，白名单方案在每次改配置时都要申请新 origin（`optional_host_permissions`），引导成本高；个人/开发用途下 `<all_urls>` 是合理默认。若日后上架商店再评估。
- 最低版本：Chrome 114（Side Panel）；`chrome.sidePanel.open()` 在用户手势（点击浮动按钮/右键菜单）内调用无问题。
- Content script 采用静态声明（`<all_urls>`, `document_idle`），只做轻量的选区监听与素材上报，不放业务逻辑、不取图片字节。

## 4. 前端（Side Panel）

- 单页应用，三个一级视图：**对话**（默认）/ **会话列表** / **设置**（API 配置 · 角色 · 偏好）；设置同时注册为 options page（同一页面）。
- 组件层级草案：
  - `App` → `Sidebar(会话/设置入口)` + `Main`
  - 对话流：`MessageList`（`MessageItem`：content / reasoning 折叠 / 来源角标 / token 分解 / 图片缩略图）
  - 输入区：`Composer`（素材卡片 `MaterialCard`(来源 + 可编辑文本 + 图片缩略图 + 补充框) + 发送/停止）
  - 状态条：`TokenStatusBar`（进度条 + 上下文数字 + 会话累计）
- 消息渲染：流式期间对**末条消息**做增量渲染（只重渲染最后一条），完成后整条定格；图片消息渲染为缩略图，点击放大（原图即归一化产物）。

## 5. 域模型与存储（core 唯一真相 = storage.local + IndexedDB 图片）

```ts
type ThinkingLevel = 'off' | 'light' | 'medium' | 'deep';

interface ThinkingConfig {
  mapping: 'reasoning_effort'            // → body.reasoning_effort = 值表
        | 'budget_tokens'               // → body.thinking = { type:'enabled', budget_tokens: 值表 }
        | 'custom';                      // → 自定义 JSON 模板插值
  values: Record<Exclude<ThinkingLevel,'off'>, string | number>;
  customTemplate?: string;              // 仅 mapping='custom'，支持 {{level}} 变量
}

interface ApiConfig {
  id: string;               // nanoid
  name: string;
  baseUrl: string;          // 形如 https://api.x.com/v1
  apiKey: string;           // 存储层明文、UI 层脱敏、日志永不落盘
  modelId: string;
  contextLimit: number;     // token；按 modelId 命中预填表则自动填，可改
  thinking: { enabled: boolean; level: ThinkingLevel; config: ThinkingConfig };
  collectUsage: boolean;    // 是否带 stream_options.include_usage（失败自动降级重试一次）
  extraBody?: object;       // 合并进请求体的附加 JSON（加分项）
  temperature?: number;
  vision: boolean;          // 该模型是否支持图片输入，默认 false（FR-4.6，D-010）
}

interface Role { id: string; name: string; systemPrompt: string; icon?: string; builtin: boolean; }

interface MsgSource { type: 'page' | 'pdf' | 'manual'; title?: string; url?: string; }

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string | StoredPart[];        // M4 起可分段（含图引用）；纯文本消息仍为 string
  reasoning?: string;                    // 旁路采集的思维链
  source?: MsgSource;
  usage?: { prompt: number; completion: number; total: number };  // 精确模式时存在
  createdAt: number;
}

interface Session {
  id: string; roleId: string;
  title: string;                          // 默认取首条用户消息前 20 字
  messages: ChatMessage[];
  createdAt: number; updatedAt: number;
}

// —— M4/D-010：图片输入 ——
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };  // 发送态：data: URL 内联

// 存储态：二进制在 IndexedDB(at:images)，消息里只放引用
type StoredPart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageId: string };
```

- 存储键（均带 `at:` 前缀——Atmate 缩写，沿用旧名免迁移）：`at:meta`（schemaVersion，做迁移）、`at:apiConfigs` + `at:activeApiConfigId`、`at:roles`、`at:sessions`、`at:uiPrefs`（含 `baseDirectiveEnabled: boolean`、`defaultContextScope: 'selection' | 'nearby' | 'page' | 'pdf-full'`、`locale: 'zh-CN' | 'en-US'`，默认 zh-CN，M6 起提供切换）。
- **图片二进制**（M4）：不入 `storage.local`——IndexedDB（库名 `at`，Atmate 缩写；store `images:{id, mime, blob, w, h, createdAt}`）承载，消息仅存 `imageId` 引用；UI 渲染走 object URL；请求组装时解析为 `data:` URL（§6）。
- 同步层：`createStorageStore`——读：启动一次性装载；写：UI 改动 → 写 storage → `chrome.storage.onChanged` 回流广播（多上下文一致）；所有 schema 变更走 `at:meta.schemaVersion` 迁移函数（M4 引入 v1→v2：消息内容 parts 化）。

## 6. LLM 接入层（infra/llm）

仅实现一种协议：**OpenAI 兼容** `POST {baseUrl}/chat/completions`。

- **请求构造**：`messages = [system(角色)] + 历史 + (素材+补充合并的 user 消息)`；按 FR-4.3 注入思维强度字段；`stream: true`；`collectUsage` 时附 `stream_options: { include_usage: true }`，若端点对此未知字段报 400，则去掉该字段自动重试一次（探测结果缓存到配置上）。
- **流式解析**（SSE）：
  - 逐行扫描 `data:`；`[DONE]` 结束；`choices[0].delta.content` 累积正文；`delta.reasoning_content`（DeepSeek 系）与 `delta.reasoning`（OpenRouter 系）采集进 `reasoning` 旁路，未识别字段不影响正文。
  - 事件回调：`onContent / onReasoning / onUsage / onDone / onError`；AbortController 实现"停止生成"。
- **错误分类**：`401/403`（Key 问题）、`404`（Base URL/模型 ID 问题）、`429`（限流）、5xx、网络中断、SSE 中途断流——各自给中文可读提示与重试入口（NFR-4）。
- **usage 采集**：流式响应若带 usage，取 `total_tokens` 计入会话累计；无则该会话标记"估算模式"。
- **system 拼装顺序**（§8.1 基础指令的落地点）：`system = 角色提示词` +（开启时）`\n\n` + `基础指令段`。基础指令段为单一字符串常量（`core/directive.ts`），内容要求实现 mission FR-1.6 的三条（完备性判断 / 缺失清单 / 不编造）；版本化（`DIRECTIVE_V1`），改文案须升版本，历史会话按当时版本存储的副本渲染。
- **图片消息构造**（M4，D-010）：素材含图时 user content 组装为 parts 数组（text / image_url 交替，`image_url` 为 data URL）；历史消息中的图片按原样重发（token 成本随之增长，剥离治理见 roadmap M5 T5.2）；`vision` 未开启而素材含图 → 拦截发送并引导（mission FR-4.6）。
- **图片归一化管线**（side panel 内执行，content script/viewer 只上报 URL，不取字节）：`fetch(srcUrl)` → `ImageBitmap` → OffscreenCanvas 缩放（长边 ≤1568px）→ 重编码 JPEG（q 0.85）→ `data:` URL；同一 URL 会话内去重缓存。选区供给附图解析 `img.currentSrc`（已解析懒加载/srcset 的真实源）。

## 7. Token 计量（core/tokens）

三级策略，按优先级降级：

1. **精确**：API 返回 usage → 逐条消息记录，会话累计求和；上下文占用 = 最近一次响应的 `usage.prompt_tokens + completion_tokens`（即下轮 input 的构成）。
2. **估算**（无 usage 时）：
   - 上下文占用 = 序列化 messages 后按"混合系数"估算：`tokens ≈ ceil(总字符数 / 3.2)`（系数对中英混合在主流 BPE 分词下经验值 ±15%，对 GLM/DeepSeek 自家分词也在此量级），UI 数字前强制加"≈"并可 hover 查看口径。
   - 会话累计 = 上次精确值 +（其后各轮的估算值）。
3. **校准**【加分】：设置里允许用户改全局估算系数，或粘贴一次官方账单 token 数反推系数。

- 图片 token（M4）：估算 ≈(宽×高)/750（像素，按归一化后尺寸计），标"≈"；精确模式由 usage 覆盖（图片计入 prompt_tokens）。计入素材预览、上下文占用与限额治理。
- 上下文上限 `contextLimit`：维护 `modelId → limit` 预填表（gpt-*/claude-*/glm-*/deepseek-*/kimi-* 等常见 ID；聚合站 `org/model` 命名如 deepseek-ai/*、Qwen/* 一并收录），命中自动填；未命中要求手填，保存前必填校验。
- 展示规则统一走 `TokenStatusBar`：进度条 + 三段变色（<70% 常态 / ≥70% 黄 / ≥90% 红）+ 达限禁发（FR-5.3）。
- 引入浏览器端 BPE 库（js-tiktoken/gpt-tokenizer，体积数百 KB）暂缓，待 M5 评估（见 roadmap 开放问题 Q4）。

## 8. 生命周期与消息

- **浮动按钮链路**：Content Script 监听 `selectionchange`（去抖 150ms）→ 有有效选区且非输入框场景 → Shadow DOM 浮层定位到选区上方 → 点击：`chrome.sidePanel.open({ tabId })` + `runtime.sendMessage`（统一消息表见 `infra/browser`：选区文本、来源、按当前档位采集的上下文供给数据，§8.2）；面板收到后生成素材卡片。右键菜单为同一 payload 的第二入口（文字 + 图片两个 context type，D-010）。
- **Background 定位**：无状态——只做菜单注册、消息中继、（可选）打开面板的手势助手。任何业务状态（会话、配置）都在 storage，SW 被杀重启无影响。
- **流式请求在 sidepanel 发起**（选型 #8 依据）：面板是常驻扩展页，无生命周期限制；`fetch` 持有 AbortController，页面关闭即中止，语义正确。Content Script 一律不发起业务请求、不取图片字节（D-010）。

### 8.1 基础指令（Base Directive，FR-1.6 的实现面）

- 文案为 `core/directive.ts` 中的版本化常量（`DIRECTIVE_V1`）；设置页提供开关（存 `at:uiPrefs.baseDirectiveEnabled`，默认 true），下一次发送生效，不追溯已发生的请求。
- 注入位置在 LLM 客户端拼装 system 时（§6）；UI 不把它显示为独立消息；会话导出（M5）时按实际发送内容附注。

### 8.2 上下文供给（Context Supply，FR-2.5 的实现面）

| 档位 | 采集方式 | 数据来源 |
|---|---|---|
| 仅选区 | selection.toString() | 现有划词链路 |
| 选区 ± 相邻段落 | Range 向外扩到最近块级元素边界，前后各 N 段（N=1）合并 | content script，无新依赖 |
| 附整页正文 | readability 正文抽取，动态 import，仅该档位时采集 | content script |
| 附 PDF 全文 | pdf.js getTextContent 拼装（>50 页仅取当前页 ±5 页并标注截断） | viewer 页，数据天然在手 |
| 附图（FR-2.6，D-010） | 右键图片(srcUrl+alt)；供给范围内 `img.currentSrc`；PDF 页 canvas 渲染(DPR×2) | content script/viewer 上报 URL，side panel 归一化 |

- 任一非"仅选区"档位的采集结果与选区一并进入素材卡片（分栏/折叠展示"将发送的内容"），**先经 token 预览/限额治理（§7）再发送**，无黑箱。
- "附整页正文"在非正文型站点提取失败时，降级为"仅选区"并在卡片显著标注"整页提取失败，仅发送选区"，不静默降级。
- 档位选择存 `at:uiPrefs.defaultContextScope`，素材卡片上可逐次改选。
- 图片供给（FR-2.6）独立于文字档位：素材卡片以缩略图呈现、逐张可移除（总数 ≤4/次发送）；PDF 页图入口在 viewer 工具栏。

## 9. PDF 策略（M3）

- **平台限制（事实）**：Chrome 内置 PDF 查看器是浏览器内部页面，扩展无法向其注入 content script，右键菜单在该页面也不保证出现——因此"在 Chrome 原生 PDF 查看器里划词"没有可靠通道。
- **对策**：扩展自建 PDF 查看页（`viewer.html`，pdf.js，Apache-2.0）。路由接管为**用户开关**（默认询问）：
  1. 打开 PDF 时（`webNavigation.onBeforeNavigate` 探测到 PDF URL；MIME 判断由 fetch HEAD 辅助），弹出一次性选择：在扩展查看页打开 / 继续用 Chrome 原生查看器（记住选择）。
  2. 接管后在 `chrome-extension://` 页内渲染——划词、浮动按钮、右键与普通网页**完全同链路**（FR-2.4 即此实现）。
  3. `file://` PDF 需要用户在扩展详情页开启"允许访问文件网址"，设置页提供引导检测。
  4. 未接管（用户选择原生查看器）时，PDF 划词功能不可用并在 UI 注明原因——诚实优于假装支持。
  5. viewer 工具栏含**"附当前页为图片"**入口（M4 T4.5，D-010）；扫描件（无文字层）由页图供给兜底。

## 10. 工程化

- 目录（WXT 约定）：
```
├ entrypoints/           # sidepanel/ · background/ · content/ · viewer(pdf) · options(复用sidepanel路由)
├ components/            # React 组件（按 §4 层级）
├ core/                  # 域层：session/role/apiConfig/tokens/directive（纯函数，可单测）
├ infra/                 # llm(客户端+SSE) · storage(同步层+schema迁移+images IDB) · browser(消息封装)
├ locales/               # zh-CN.ts · en-US.ts：typed 文案字典（§1 #10，M6 上线）
├ assets/ specs/         # 复用样式；每个里程碑的功能 spec（见 roadmap §1）
└ tests/
```
- 质量门禁（CI/本地 pre-commit 同一命令集）：`tsc --noEmit` · `eslint` · `vitest run`。
- **测试规范（四层金字塔，roadmap §1 DoD 强制）**：

  | 层级 | 测什么 | 工具 | 环境 | 目录 | 占比 |
  |---|---|---|---|---|---|
  | L1 core 域层单测 | 纯函数：token 估算、prompt 组装、消息 parts 化、schema 迁移、角色指令合并、上下文供给组装 | vitest | node | `tests/core/` | ~60% |
  | L2 infra 层单测 | SSE 解析、storage 同步、消息封装、图片归一化 | vitest + `vi.mock` + `@webext-core/mocks` 的 `mockBrowser` | node | `tests/infra/` | ~20% |
  | L3 组件测试 | Composer / MessageList / TokenStatusBar / MaterialCard 的渲染与交互 | @testing-library/react + user-event（M1 后引入） | jsdom | `tests/components/` | ~15% |
  | L4 E2E 冒烟 | 真实 Chrome 加载扩展：划词→侧边栏打开→流式应答关键路径 | Playwright（M3 后引入） | 真实 Chrome | `e2e/` | ~5% |

  - **L2 mock 方案（ADR-009）**：采用 `vi.mock` 直接 mock + `@webext-core/mocks` 的 `mockBrowser` 批量替身，不做依赖注入。示例：
    ```ts
    import { mockBrowser } from '@webext-core/mocks';
    import { describe, it, expect, beforeEach, vi } from 'vitest';

    vi.mock('wxt/browser', () => ({ default: mockBrowser }));

    beforeEach(() => mockBrowser.reset());

    it('storage 同步层读写', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({ 'at:roles': [] });
      // ... 调用被测函数，断言 mockBrowser.storage.local.set 被调用
    });
    ```
    `mockBrowser` 覆盖本项目用到的全部 chrome API：`storage.local.get/set`、`storage.onChanged`、`runtime.sendMessage/onMessage`、`sidePanel.open`、`contextMenus`、`commands`、`webNavigation`。
  - **vitest 环境切换**：默认 `environment: 'node'`（L1/L2）；L3 组件测试在文件顶部加 `// @vitest-environment jsdom` 逐文件切换（vitest 5 已移除 `environmentMatchGlobs`，不拆 projects 配置以保持简洁）。
  - **文件命名**：`<被测模块名>.test.ts`（或 `.test.tsx`），与源码模块一一对应；测试内 `describe` 用模块名，`it` 用行为描述（"空字符串返回 0"而非"test1"）。
  - **边界用例强制清单**（核心模块必须覆盖，否则 T*.x 不得勾选）：
    - token 估算：空文本、超长文本（100k+ 字符）、纯中文、纯英文、中英混合、仅空白字符；
    - SSE 解析：正常流、`[DONE]` 正常结束、`[DONE]` 出现在异常位置、断流（连接中途关闭）、畸形 chunk（非 JSON / 缺 choices / delta 为空）、`delta.reasoning_content` 与 `delta.reasoning` 两种方言、多行 `data:` 合并；
    - 图片归一化：损坏字节、超大图（长边 >4096px）、不支持的格式、SVG（应拒绝或降级）、fetch 失败；
    - storage schema 迁移：v1 纯文本消息 → v2 parts 化、旧版本缺失字段补默认、未知 schemaVersion 报错而非静默；
    - 上下文供给：空选区、选区在输入框内、readability 提取失败降级、>50 页 PDF 截断、超长选区截断提示；
    - `collectUsage` 探测：端点对未知字段 400 → 去掉字段重试一次、重试成功后缓存探测结果。
  - **提交门禁**：每个 T*.x 任务完成时，对应测试文件必须存在且 `pnpm test` 全绿；无测试的核心逻辑变更不得勾选任务、不得提交（roadmap §1 DoD）。M0 过渡期 `passWithNoTests: true`，M1 收尾时关闭。
  - **不做的事**：不对 chrome API 本身做测试（那是浏览器的责任）；不在单测里起真实 HTTP 服务（mock fetch）；M1~M2 不上 E2E（交互仍在变，重写成本高）。
- 代码风格 ESLint + Prettier；提交信息 Conventional Commits（feat/fix/spec/…）。

## 11. 风险与对策

| 风险 | 等级 | 对策 |
|---|---|---|
| MV3 SW 生命周期杀掉长流式连接 | 高 | 已规避：流式 fetch 放扩展页面（选型 #8） |
| 各家"OpenAI 兼容"实为方言（usage 字段、reasoning 字段、未知字段 400） | 高 | §6 的探测+自动降级重试；错误分类给中文提示；spec 中列出已验证端点清单 |
| `<all_urls>` 引发商店/用户顾虑 | 中 | NFR-2 中如实声明用途；上架前评估 optional_host_permissions（开放问题 Q5） |
| pdf.js 在扩展页的体积与二次打包 | 中 | 动态 import，仅 viewer 入口加载 |
| Token 估算偏差导致用户误判成本 | 中 | 精确优先、估算必带"≈"与口径说明；M5 提供校准（含图片公式） |
| 浮动按钮与站点样式/脚本冲突 | 中 | Shadow DOM 封装；不内联注入全局样式；z-index 高位但仅限浮层节点 |
| readability 在"非正文型"页面（Web App、代码站）提取失败或抽出导航噪声 | 中 | 失败降级为"仅选区"并显著标注（§8.2）；提取结果先入素材卡片可见，无黑箱；GFM 站外链接不额外抓取 |
| 基础指令与个别角色提示词冲突（如角色自带"直接作答不许反问"） | 低 | 拼装顺序角色在前、基础指令在后（§6）；冲突时以"列出缺失清单但继续回答"为语义兜底；用户可全局关闭（FR-1.6） |
| vision 开关与模型实际能力不符（勾选错误 → 400 或图片被静默忽略） | 中 | 错误分类给出中文引导；素材含图而未开启时红条禁发、开启后请求含图即有响应差异可验证（FR-4.6） |
| 图片导致存储与历史请求体膨胀（多轮重发累积） | 中 | 归一化控制单图体积（§6）；二进制走 IndexedDB；压缩历史可把早期图片剥离为占位文本（roadmap M5 T5.2） |
| 图片内文字构成提示注入面（页面图含恶意指令文本） | 低 | 无工具执行面，最坏仅影响回答倾向；素材卡片所见即所发；基础指令"不得编造/说明来源"条款兜底 |
| storage.local 容量（10MB 上限）与会话膨胀 | 低 | 会话文本存 storage，图片二进制分置 IndexedDB（§5）；文本超限清理策略列入开放问题 Q6 |
| Chrome 114 之前版本 | 低 | manifest `minimum_chrome_version`，安装即拦截 |

## 12. ADR 索引

- **ADR-001 采用 WXT**：MV3 多入口交给框架管理，manifest 手写是长期负债。
- **ADR-002 流式请求在扩展页面发起**：接受"面板关闭即中断"的语义，换取不实现 SW keep-alive。
- **ADR-003 仅实现 OpenAI 兼容协议**：一套格式覆盖绝大多数端点（含 vision 的 content parts）；Anthropic 原生协议列为 M6 可选。
- **ADR-004 API Key 存 storage.local 明文**：本机磁盘信任边界内，不引入加密复杂度；密钥加密列入开放问题 Q3。
- **ADR-005 PDF 由扩展自建查看页接管（用户开关）**：平台限制下唯一可靠路径；不假装支持原生查看器。
- **ADR-006 前端状态以 storage 为唯一真相源**：SW/面板/查看页多上下文一致性靠 onChanged 广播，不靠内存同步。
- **ADR-007 信息缺口用提示词层解决，不引入工具层**（2026-09-13 评审）：信息不完整的需求以三件事闭环——FR-1.6 基础指令（AI 声明缺失清单）、多轮会话 + FR-2.5 上下文供给（用户补足信息）、素材卡片透明可见（无黑箱）。不做 tool calling：OpenAI 兼容端点对工具支持参差、引入 prompt injection 面与确认交互成本。待真实使用反馈证明"声明缺口"不够用后再重评（届时进入 M6 候选池）。
- **ADR-008 图片输入只在扩展侧归一，二进制分置 IndexedDB**（2026-09-13，D-010）：content script/viewer 只上报 URL，由 side panel 统一取回、降采样（长边 ≤1568px → JPEG）、以 `data:` URL 内联发送——不要求端点回源抓图（NFR-2"仅两方"）；图片字节不入 storage.local；音频/视频维持 out of scope。
- **ADR-009 测试分层为四层金字塔，L2 采用 vi.mock + mockBrowser 而非依赖注入**（2026-09-14）：Chrome 扩展多上下文、强依赖 chrome API，测试策略按"越底层越纯、越容易测"组织——L1 core 纯函数（node，~60%）、L2 infra  mock chrome（node，~20%）、L3 组件（jsdom，~15%）、L4 E2E（真实 Chrome，~5%，M3 后引入）。L2 不做依赖注入（方案 A）而用 `vi.mock('wxt/browser')` + `@webext-core/mocks` 的 `mockBrowser`（方案 B）：项目 infra 层薄、规模小，方案 B 写得快且与 WXT 生态一致；`mockBrowser` 提供完整 API 替身，避免手写字段遗漏。代价是 mock 与实现耦合紧，若 chrome API 调用方式大改需同步更新 mock——但本项目 API 接触面稳定，可接受。
