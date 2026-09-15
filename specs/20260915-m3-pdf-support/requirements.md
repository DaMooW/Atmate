# M3 · PDF 支持 — Requirements

> 评审定案（2026-09-15，AskUserQuestion）：PDF 接管=默认询问（首次弹窗+记住选择）；file://=完整支持（引导开启文件访问）；pdf.js=npm 打包进扩展（pdfjs-dist + 动态 import）；大 PDF 性能=纳入必须验证（>20MB / >500 页）。
> 依据：[mission.md](../../mission.md)、[roadmap.md §5](../../roadmap.md)、[techniqueStack.md §9](../../techniqueStack.md)

## 1. 背景（Why）

M2 已交付完整的网页划词链路（浮动按钮 + 右键菜单 + 素材卡片 + 上下文供给三档），但**PDF 是阅读/翻译/研读场景的核心载体**——论文、技术文档、报告大多以 PDF 形式存在。当前用户打开 PDF 后无法使用划词功能，产品灵魂链路在 PDF 场景断裂。

**平台限制（事实，ADR-005）**：Chrome 内置 PDF 查看器是浏览器内部页面，扩展无法向其注入 content script，右键菜单在该页面也不保证出现。因此"在 Chrome 原生 PDF 查看器里划词"没有可靠通道。

M3 的对策是**扩展自建 PDF 查看页**（`viewer.html` + pdf.js）：当用户打开 PDF 时，将页面导航到扩展页内渲染。在 `chrome-extension://` 页内，PDF 被渲染为普通 DOM，M2 的划词链路（选区监听、浮动按钮、右键菜单、上下文供给）**原样复用**，无需重写。同时落地 **FR-2.5 的"附 PDF 全文"档**：利用 pdf.js 的 `getTextContent()` 提取全文，大文档按页码截断。

此里程碑**不涉及图片输入**（M4，含 PDF 页图）、**不涉及 usage 精确模式**（M5）、**不涉及 i18n**（M6）。

引用的 FR/NFR：
- FR-2.4（PDF 划词：在扩展自建的 PDF 查看页内划词，链路与网页一致）
- FR-2.5（上下文范围：附 PDF 全文档，大文档截断策略）
- FR-7.1（浮动按钮：在 viewer 页内同样可用）
- FR-7.2（右键菜单：在 viewer 页内同样可用）
- NFR-1（性能：大 PDF 不阻塞 UI，懒加载页面）
- NFR-2（安全：PDF 字节仅在本地处理，不上传任何第三方）
- NFR-3（兼容性：Chrome ≥114；PDF 划词依赖扩展自建查看页，属平台限制）
- NFR-4（健壮性：PDF 加载失败、损坏文件、file:// 权限缺失均有明确提示）

## 2. 范围（Scope）

### 在范围

| 领域 | 内容 | 对应 T |
|---|---|---|
| viewer 入口 | WXT entrypoint `viewer/`；pdfjs-dist npm 依赖 + 动态 import；加载 http/https/file:// PDF；渲染工具栏（页码/缩放/下载） | T3.1 |
| 导航接管 | `webNavigation.onBeforeNavigate` 探测 PDF URL；一次性选择弹窗（扩展查看页 / 原生 + 记住选择）；设置页总开关；file:// 权限引导 | T3.2 |
| viewer 内划词 | content script 注入 viewer 页（`chrome-extension://` 页匹配）；复用 M2 选区监听/浮动按钮/右键菜单链路 | T3.3 |
| 来源标注 | 素材卡片来源显示 `pdf://文件名 / 第 N 页`；页码定位通过 pdf.js 当前页获取 | T3.4 |
| 大 PDF 性能 | >20MB / >500 页 PDF 加载验证；pdf.js 懒加载页面（默认渲染可视区域，滚动时加载）；性能指标记录 | T3.5 |
| 附 PDF 全文档 | 上下文供给新增 `pdf-full` 档；`getTextContent()` 提取全文；>50 页截断为当前页 ±5 页并标注；token 预览联动；单测 | T3.6 |
| spec 归档 | 本目录三件套更新为已实现版；roadmap 回勾 | T3.7 |

### 明确不做（本里程碑）

- **PDF 页图输入**（"附当前页为图片"、框选区域截图）→ M4（T4.5，D-010）
- **图片输入整体**（右键图片、供给附图、vision 开关、schema v2）→ M4
- **usage 精确模式、压缩历史、reasoning 折叠、导出、快捷键、温度/extraBody** → M5
- **i18n 中英切换** → M6；M3 UI 文案中文硬编码
- **PDF 注释/表单填写/签名** → Out of Scope（非阅读辅助场景）
- **PDF 内搜索高亮** → 加分项，本里程碑不做（pdf.js 自带搜索栏可保留）
- **E2E 测试**（Playwright）→ 后续；M3 做 L1/L2 单测，L3 组件测试按需

## 3. 决策（Decisions）

| # | 决策 | 依据 |
|---|---|---|
| D1 | M3 范围严格 = roadmap T3.1–T3.7，不裁剪、不增项 | spec-first 流程；roadmap §5 |
| D2 | **PDF 接管默认行为=默认询问**：首次打开 PDF 时弹出一次性选择窗（"在扩展查看页打开 / 继续用 Chrome 原生查看器" + "记住选择"复选框）；用户选择后不再弹窗；设置页有总开关可重置 | 评审 Q1（2026-09-15）：用户选择"默认询问"，尊重用户对 PDF 打开方式的选择权；roadmap Q2 默认倾向一致 |
| D3 | **file:// PDF 完整支持**：检测到 `file://` 协议 PDF 时，检查扩展是否有"允许访问文件网址"权限；无权限时显示引导页（说明如何在 chrome://extensions 开启）；有权限时正常加载 | 评审 Q2（2026-09-15）：用户选择"完整支持"；本地 PDF 是论文/文档阅读的常见场景 |
| D4 | **pdf.js = npm 打包进扩展**：安装 `pdfjs-dist` 作为依赖；在 viewer 入口通过**动态 import** 加载（`await import('pdfjs-dist')`），不打进 sidepanel/content 的 bundle；worker 文件通过 Vite 打包为扩展资源 | 评审 Q3（2026-09-15）：用户选择"npm 打包进扩展"；离线可用、无外部网络依赖、版本可控；动态 import 保证主 bundle 体积不膨胀 |
| D5 | **大 PDF 性能验证纳入必须验收**：验收清单包含 >20MB 和 >500 页 PDF 的加载/划词/翻页性能；记录首屏渲染时间、滚动流畅度、内存占用；pdf.js 默认启用懒加载（`renderInteractiveForms` 关闭，仅渲染可视页） | 评审 Q4（2026-09-15）：用户选择"纳入，必须验证"；论文/技术文档常超百页，性能是核心体验 |
| D6 | **viewer 页复用 M2 content script 链路**：viewer 页是 `chrome-extension://` 协议的普通网页，content script 的 `matches` 需包含扩展自身页面（`<all_urls>` 不含 chrome-extension，需额外配置 `match_about_blank` 或在 viewer 页内直接初始化划词模块）；优先方案：viewer 页内直接 import 并初始化 M2 的选区监听+浮动按钮模块（不经过 content script 注入），因为扩展页有权直接访问 DOM | T3.3；tech §4 架构图（viewer 页内划词）；避免 content script 注入扩展页的匹配限制 |
| D7 | **导航接管实现**：background 监听 `chrome.webNavigation.onBeforeNavigate`，判断 URL 是否为 PDF（扩展名 `.pdf` 或 `Content-Type: application/pdf`，需 fetch HEAD 辅助）；是 PDF 且用户未选择"始终原生"时，`tabs.update` 重定向到 `viewer.html?file=<encoded_url>`；选择窗通过 `chrome.scripting.executeScript` 在原页面注入弹窗，或在 viewer 加载前显示中间选择页 | T3.2；tech §9；webNavigation 权限需新增 |
| D8 | **"记住选择"存储**：用户选择存在 `at:uiPrefs.pdfOpenMode`（`'ask' \| 'viewer' \| 'native'`），默认 `'ask'`；选择"始终用扩展查看页"→ `'viewer'`；选择"始终用原生"→ `'native'`；设置页可重置为 `'ask'` | T3.2；ADR-006（storage 为唯一真相源） |
| D9 | **附 PDF 全文档截断策略**：≤50 页取全文；>50 页取当前页 ±5 页（共 11 页），在素材卡片标注"全文过长，已截取第 X-Y 页"；用户可手动调整截取范围【加分】；空文档（无文字层的扫描件）标注"此 PDF 无文字层，建议使用'附当前页为图片'（M4）" | T3.6；tech §8.2；mission FR-2.5；扫描件兜底在 M4 |
| D10 | **来源标注格式**：素材卡片来源角标显示 `📄 文件名.pdf · 第 N 页`；hover 显示完整文件路径或 URL；页码取 pdf.js `getPageIndex(currentPage)` + 1（1-based） | T3.4；与网页来源 `🌐 标题 · URL` 格式区分 |
| D11 | **权限新增**：`webNavigation`（导航探测必需）；manifest permissions 从 `["sidePanel", "storage", "contextMenus"]` 变为 `["sidePanel", "storage", "contextMenus", "webNavigation"]`；不新增 host_permissions（`<all_urls>` 已在 M0 声明，用于 fetch PDF 字节和 HEAD 请求）；`CHROMEWEBSTORE.md` 同步记录权限理由 | tech §3；最小权限原则；T3.2 |
| D12 | **测试按 techniqueStack §10 四层金字塔执行**；每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成；T3.6（>50 页截断逻辑 + 页码标注 + 空文档）必须有 L1 单测；T3.2（导航接管分流）用 L2（vi.stubGlobal + fakeBrowser，fakeBrowser 未实现 webNavigation 需手动 mock） | roadmap §1 DoD（v0.5）；techniqueStack §10 |
| D13 | **PDF 加载失败处理**：pdf.js 加载失败（损坏文件、跨域限制、密码保护）时，viewer 页显示明确错误提示（中文）+ "在 Chrome 原生查看器打开"按钮 + 重试按钮；不静默白屏 | NFR-4；T3.1 |
| D14 | **viewer 工具栏最小集**：页码显示（第 N / 总 M 页）、上一页/下一页、缩放（+/-/适应宽度）、下载原文件、"在原生查看器打开"；不做注释/表单/签名；pdf.js 默认工具栏可定制或自建 | T3.1；阅读辅助场景只需导航+缩放 |
| D15 | **多窗口边缘情况暂不处理**（同 M2 D17）：PDF 接管不区分窗口，全局 `pdfOpenMode` 生效 | 实现复杂度权衡；大多数用户单窗口 |
| D16 | **扫描件（无文字层）自动检测与提示**：viewer 加载 PDF 后，对当前可视页调用 `getTextContent()` 检测文字层；若某页文字项为空或极少（< 阈值），在 viewer 顶部显示黄色提示条"此页可能是扫描件（无文字层），划词可能无法选中文字。M4 上线后可使用「附当前页为图片」发送给 AI。"；翻页时重新检测当前页；全文档均无文字层时提示条常驻并标注"全文为扫描件" | 用户反馈（2026-09-15）：扫描件 PDF 打开后用户不知道无法划词，划词失败会困惑；需在 viewer 页主动提示而非等用户划词失败才发现；M4 的页图输入是扫描件的最终兜底通道，M3 先做诚实标注 |
| D17 | **不可处理 PDF 的分级提示**：加载阶段失败（加密/损坏/格式不支持）→ 错误页 + 原生打开按钮（D13）；加载成功但功能受限（扫描件无文字层）→ 警告条 + 可继续查看但划词不可用的说明；两类提示视觉区分（错误=红色/警告=黄色），不混淆 | NFR-4 健壮性；诚实优先原则（AGENTS.md）；用户反馈（2026-09-15） |

## 4. 上下文与约束（Context & Constraints）

### 4.1 交互稿要点

**PDF 打开流程（默认询问）**：
1. 用户在浏览器地址栏输入/点击 PDF 链接 → 页面开始导航
2. background `webNavigation.onBeforeNavigate` 探测到 PDF URL
3. 若 `pdfOpenMode === 'ask'`：在原页面注入选择弹窗（居中、遮罩、两个按钮 + "记住选择"复选框）
   - "在扩展查看页打开" → `tabs.update` 重定向到 `viewer.html?file=<url>`，若勾选记住则存 `'viewer'`
   - "继续用 Chrome 原生查看器" → 取消重定向，让原生加载，若勾选记住则存 `'native'`
4. 若 `pdfOpenMode === 'viewer'`：直接重定向，不弹窗
5. 若 `pdfOpenMode === 'native'`：不干预，原生加载

**file:// 权限引导**：
- 重定向到 `viewer.html?file=file://...` 后，viewer 检测 `chrome.extension.isAllowedFileSchemeAccess()`
- 若返回 false：显示引导页（"此扩展需要'允许访问文件网址'权限才能打开本地 PDF" + 步骤说明 + 打开 `chrome://extensions` 的按钮）
- 若返回 true：正常加载

**viewer 页内划词**：
- viewer 页加载完成后，初始化 M2 的选区监听模块（直接 import，非 content script 注入）
- 划词后行为与网页完全一致：侧边栏已打开→直接投递素材卡片 / 未打开→显示浮动按钮
- 右键菜单在 viewer 页同样可用（`contextMenus` 权限覆盖扩展页）

**扫描件检测与提示（D16）**：
- viewer 页渲染完成后，对当前页调用 `page.getTextContent()`，检查 `items` 数组长度
- 若 `items.length === 0`（或 < 阈值，如 < 5 个文字项，排除纯图片页）→ viewer 顶部显示黄色警告条
- 警告条内容："⚠️ 此页可能是扫描件（无文字层），划词可能无法选中文字。M4 上线后可使用「附当前页为图片」发送给 AI。"
- 翻页时重新检测新的当前页；若新页有文字层则隐藏警告条
- 若连续检测多页（如前 5 页）均无文字层 → 警告条升级为"全文为扫描件"，常驻显示
- 警告条可手动关闭（× 按钮），关闭后本次会话不再提示该文档

**附 PDF 全文档**：
- 素材卡片上下文档位新增"附 PDF 全文"（仅在 viewer 页来源的卡片上显示）
- 点击后调用 pdf.js `getTextContent()` 提取文本，按 D9 截断
- 预览区显示提取的文本（可折叠），token 预览实时更新
- 若文档为扫描件（无文字层），切换到"附 PDF 全文"档时显示"此 PDF 无文字层，无法提取全文。建议使用「附当前页为图片」（M4）"

### 4.2 数据与接口变更

**storage schema**：
- 新增 `at:uiPrefs.pdfOpenMode: 'ask' | 'viewer' | 'native'`（默认 `'ask'`）
- schemaVersion 不变（v1，M4 才升 v2）；新增字段有默认值，旧数据兼容

**消息传递**：
- 无新增消息类型；viewer 页内划词复用 M2 的 `AT_SELECTION_SEND` / `AT_FLOAT_BUTTON_CLICK` / `AT_PANEL_READY` 协议
- background 新增 webNavigation 监听逻辑，不涉及新消息

**组件层级**：
- 新增 `entrypoints/viewer/`（WXT entrypoint，HTML + TS）
- viewer 页内复用 `entrypoints/content/selection/`、`entrypoints/content/float-button/`、`entrypoints/content/messaging/` 模块（直接 import）
- 设置页新增"PDF 打开方式"选项（三选一：询问 / 始终扩展查看页 / 始终原生）

**WXT 配置**：
- `wxt.config.ts` 新增 viewer entrypoint
- pdf.js worker 文件需配置为 Vite 资源（`?worker` 或 `?url`），确保打包到 `dist/`

### 4.3 边界与异常

| 场景 | 处理 |
|---|---|
| PDF URL 无 `.pdf` 扩展名但 Content-Type 是 `application/pdf` | fetch HEAD 检测 Content-Type；超时（>3s）则按扩展名判断，不阻塞导航 |
| 密码保护的 PDF | pdf.js 抛出 `PasswordException`，viewer 显示密码输入框（一次尝试），失败则提示"密码错误，无法在扩展查看页打开" + 原生打开按钮 |
| 损坏/无效 PDF | pdf.js 抛出 `InvalidPDFException`，显示"文件损坏" + 原生打开按钮 + 重试 |
| 跨域 PDF（CORS 限制） | `<all_urls>` host 权限下扩展页 fetch 不受 CORS 限制；若仍失败（如服务器要求特定 header），提示并提供原生打开按钮 |
| file:// 无权限 | 引导页（见 §4.1） |
| 大 PDF 内存溢出 | pdf.js 懒加载缓解；若仍崩溃，提示"文件过大，建议使用 Chrome 原生查看器" |
| 用户选择"始终原生"后想改回 | 设置页"PDF 打开方式"切换为"询问"即可重置 |
| webNavigation 探测到 PDF 但 tab 已关闭 | 忽略，不操作 |
| viewer 页内划词但 pdf.js 尚未渲染完成 | 选区监听在 DOM ready 后初始化，pdf.js 渲染层是 canvas+textLayer，textLayer 有真实 DOM 可划词 |
| 扫描件 PDF（无文字层） | viewer 加载后自动检测当前页文字层（D16）：无文字层 → 顶部黄色警告条提示；划词时选区为空或乱码 → 浮动按钮仍可出现但素材卡片标注"此页无文字层，选中内容可能无效"；附 PDF 全文档显示无文字层提示；最终兜底通道"附当前页为图片"在 M4 |
| 混合 PDF（部分页有文字层、部分是扫描图） | 翻页时逐页检测，有文字层的页正常划词、无文字层的页显示警告条；附 PDF 全文档只提取有文字层的页，扫描页标注"（第 N 页无文字层，已跳过）" |
| 加密 PDF（密码保护） | pdf.js 抛出 PasswordException → viewer 显示密码输入框；输入正确 → 渲染；输入错误 → 提示密码错误 + 原生打开按钮；不存储密码 |
| PDF 版本过旧/不支持的特性 | pdf.js 通常兼容 PDF 1.0–1.7；若遇到不支持的特性（如某些 XFA 表单、3D 内容），渲染可能不完整但不崩溃；viewer 不做特殊处理，标注"已知限制" |

### 4.4 与 M4 的衔接

- M4 T4.5 需要在 viewer 工具栏添加"附当前页为图片"按钮（DPR×2 canvas 渲染）
- M3 的 viewer 工具栏预留扩展点（按钮位置），M4 直接添加
- M3 的 `pdf-full` 档对扫描件无效（无文字层），M4 的页图输入是扫描件的兜底通道
