# M3 · PDF 支持 — Plan

> 分支：`20260915-m3-pdf-support` · 依据：[roadmap.md §5](../../roadmap.md)（M3）、[mission.md](../../mission.md)、[techniqueStack.md §9](../../techniqueStack.md)
> 任务组与 roadmap T3.1–T3.7 **严格按顺序一一对应**；每组完成即在本文勾选，并同步回勾 roadmap.md。
> 测试强制：每个 T*.x 对应测试写完且 `pnpm test` 全绿才算完成（roadmap §1 DoD）。

## 1. viewer 入口：pdf.js 渲染页（对应 T3.1, D4, D13, D14）

**目标**：WXT viewer entrypoint 上线，pdfjs-dist 动态 import 加载，能渲染 http/https/file:// PDF，工具栏最小集可用，加载失败有明确提示。

- [x] 1.1 安装 `pdfjs-dist` 依赖（npm）；确认版本与 Vite 打包兼容性
- [x] 1.2 WXT 配置新增 `entrypoints/viewer/`：`viewer.html` + `main.ts`（main 入口）；WXT 自动识别 entrypoint 目录
- [x] 1.3 pdf.js 初始化：`import * as pdfjsLib from 'pdfjs-dist'`；worker 配置（`GlobalWorkerOptions.workerSrc` 指向打包后的 worker 文件，用 `?url` 导入）；`getDocument({ url })` 加载
- [x] 1.4 URL 参数解析：`viewer.html?file=<encoded_pdf_url>`；支持 http/https/file://；file:// 时调用 `browser.extension.isAllowedFileSchemeAccess()` 检测权限
- [x] 1.5 页面渲染：pdf.js `page.render({ canvas, canvasContext, viewport })` 渲染到 canvas；TextLayer 类叠加（保证可划词）；默认 1.0 缩放；单页渲染（翻页时重新渲染）
- [x] 1.6 工具栏最小集（D14）：页码显示（第 N / 总 M 页）、上一页/下一页、缩放（+ / - / 适应宽度）、下载原文件、"在原生查看器打开"按钮
- [x] 1.7 file:// 无权限引导页（D3）：检测 `isAllowedFileSchemeAccess() === false` → 显示引导页（说明 + 打开 `chrome://extensions` 按钮）
- [x] 1.8 加载失败处理（D13）：捕获 `PasswordException` → 密码输入框；`InvalidPDFException` → "文件损坏"提示；`MissingPDFException` → "文件未找到"；其他错误 → 通用错误提示；均提供"在 Chrome 原生查看器打开"按钮 + 重试
- [x] 1.9 扫描件自动检测（D16）：页面渲染完成后调用 `page.getTextContent()`，检查 `items.length`；阈值判断（< 5 个非空白文字项视为无文字层）；翻页时重新检测当前页；连续 5 页无文字层 → 标记"全文为扫描件"
- [x] 1.10 扫描件警告条 UI（D16）：viewer 顶部黄色警告条组件——文案"⚠️ 此页可能是扫描件（无文字层）…"；全文扫描件时文案改为"⚠️ 此文档为扫描件…"；可手动关闭（×），关闭后本次会话不再提示；翻页到有文字层的页时自动隐藏
- [x] 1.11 **L1 单测**：URL 解析纯函数（`isPdfUrl`/`extractFileName`/`parseViewerUrl`/`isFileUrl`）、导航分流纯函数（`decidePdfAction`）、扫描件检测纯函数（`isScannedPage`/`isAllScanned`）
- [ ] 1.12 **L2 单测**：file:// 权限检测、加载失败分类、扫描件警告条显示/隐藏/关闭逻辑（viewer 页行为测试需模拟 DOM，后续补）

**完成判据**：`pnpm dev` 后访问 `chrome-extension://<id>/viewer.html?file=https://example.com/test.pdf` 能看到 PDF 渲染；工具栏翻页/缩放可用；file:// 无权限时显示引导页；损坏 PDF 显示错误提示；扫描件 PDF 显示黄色警告条，正常文字 PDF 不显示；三门禁全绿。

## 2. PDF 导航接管：探测 + 选择弹窗 + 设置开关（对应 T3.2, D2, D7, D8, D11）

**目标**：background 监听 webNavigation，探测 PDF URL 后按用户选择分流（询问/直接接管/不干预），设置页可配置。

- [x] 2.1 manifest 新增 `webNavigation` 权限（D11）；`CHROMEWEBSTORE.md` 同步记录权限理由
- [x] 2.2 `entrypoints/background/pdf-navigation.ts`：`chrome.webNavigation.onBeforeNavigate` 监听；过滤主框架导航（`frameId === 0`）；判断是否为 PDF：URL 以 `.pdf` 结尾（忽略大小写，含 query/hash 前）；【偏差】fetch HEAD 检测 Content-Type 未实现，仅扩展名检测（多数 PDF URL 有 .pdf 扩展名，后续可补）
- [x] 2.3 分流逻辑（D2/D8）：
  - `pdfOpenMode === 'viewer'` → `chrome.tabs.update(tabId, { url: viewerPage + '?file=' + encodeURIComponent(pdfUrl) })`
  - `pdfOpenMode === 'native'` → 不干预
  - `pdfOpenMode === 'ask'` → 重定向到 viewer.html?file=...&ask=1（由 viewer 页显示选择弹窗）
- [x] 2.4 选择弹窗实现：【偏差】未用 `chrome.scripting.executeScript` 注入（避免新增 scripting 权限），改为重定向到 viewer 页并带 `ask=1` 参数，viewer 页内显示选择弹窗（两个按钮 + "记住选择"复选框）；点击"扩展查看页"→ 去掉 ask 参数加载 PDF + 若记住则存 `'viewer'`；点击"原生"→ `window.location.replace(pdfUrl + '#atmate-skip')` + 若记住则存 `'native'`；skip 标记打破循环
- [x] 2.5 storage 新增 `at:uiPrefs.pdfOpenMode`（默认 `'ask'`）；`core/defaults.ts` 补默认值；`core/schema.ts` 迁移补全；旧数据无此字段时用默认
- [x] 2.6 设置页新增"PDF 打开方式"选项：三选一 radio（每次询问 / 始终用扩展查看页 / 始终用 Chrome 原生）；切换即时生效（写 storage）
- [x] 2.7 竞态处理：frameId !== 0 忽略；扩展自身页面（chrome-extension://）跳过；带 `#atmate-skip` 标记的导航跳过；tabs.update 失败时 console.error
- [x] 2.8 **L1 单测**：PDF URL 判断纯函数（`isPdfUrl`：.pdf/.PDF/.pdf?query/.pdf#hash/非 pdf/无扩展名/无效 URL）、分流逻辑纯函数（`decidePdfAction`：三种模式的返回值 + 自定义路径 + file:// 编码）
- [ ] 2.9 **L2 单测**：webNavigation 监听行为（fakeBrowser 未实现 webNavigation，需手动 mock）；`pdfOpenMode` 三种模式的 tabs.update 调用/不调用（后续补）

**完成判据**：打开在线 PDF 链接 → 弹出选择窗 → 选"扩展查看页"→ 跳转到 viewer 页渲染；选"原生"+记住 → 后续 PDF 直接原生打开；设置页切换为"始终扩展"→ 直接跳转不弹窗；三门禁全绿。

## 3. viewer 内划词：复用 M2 链路（对应 T3.3, D6）

**目标**：viewer 页内划词行为与普通网页完全一致（浮动按钮/右键菜单/素材卡片），不经过 content script 注入。

- [x] 3.1 viewer 页内直接 import M2 模块：`entrypoints/content/selection/monitor.ts`、`entrypoints/content/float-button/index.ts`、`entrypoints/content/messaging/send.ts`；在 PDF 渲染完成后初始化
- [x] 3.2 确认 M2 模块与 viewer 环境兼容：选区监听作用于 `document`（pdf.js TextLayer 是真实 DOM 元素）；浮动按钮挂载到 `document.body`；消息发送走 `browser.runtime.sendMessage`（扩展页可用）
- [x] 3.3 右键菜单在 viewer 页可用：`contextMenus` 权限覆盖 `chrome-extension://` 页；M2 的 context-menus.ts 无需修改
- [x] 3.4 侧边栏状态感知分流（D16）：viewer 页划词后同样走 `AT_SELECTION_SEND` → background 分流（已打开→直接投递 / 未打开→显示浮动按钮）
- [x] 3.5 来源标识：viewer 页发送的素材 `source` 字段标记为 `'pdf-viewer'`（与 `'float-button'`/`'context-menu'`/`'auto-fill'` 区分），sidepanel 据此显示 PDF 来源角标
- [ ] 3.6 扫描件划词提示（D16）：【部分完成】pdfMeta.isScanned 字段已传递；素材卡片红色小字提示和空选区提示的 UI 后续补
- [ ] 3.7 **L2 单测**：viewer 页划词初始化、来源标识、右键菜单、扫描件提示（后续补）

**已知问题**：viewer 页内划词文本存在偏移（向前多取几个字符）。根因是 pdf.js TextLayer 绝对定位 span 与浏览器原生选区的交互问题，`core/selection/extract.ts` 的 Range 精确提取+零宽字符过滤未完全解决。用户确认暂不深入解决，详见 validation.md §3.1。

**完成判据**：在 viewer 页打开 PDF → 划词 → 侧边栏已打开时直接出现素材卡片 / 未打开时出现浮动按钮 → 点击后侧边栏打开并接收素材；右键菜单同样可用；三门禁全绿。（划词文本准确性为已知问题，不阻塞合并）

## 4. 来源标注：pdf://文件名/页码（对应 T3.4, D10）

**目标**：来自 PDF 的素材卡片显示文件名和页码，与网页来源区分。

- [x] 4.1 viewer 页发送素材时，payload 携带 `pdfMeta: { fileName, pageNumber, totalPages, isScanned }`；`fileName` 从 URL 解析（`extractFileName`）；`pageNumber` 从 `viewer.pageNumber` 获取
- [x] 4.2 sidepanel 素材卡片组件扩展：检测 `source === 'pdf-viewer'` → 来源角标显示 `📄 {fileName} · 第 {pageNumber} 页`；URL 仍可点击
- [x] 4.3 页码定位：取 viewer 当前页（`viewer.pageNumber`）；【偏差】未从 DOM 元素查找 `data-page-number`（pdf.js v6 TextLayer 元素无此属性，跨页选区取当前页即可）
- [x] 4.4 **L1 单测**：文件名解析纯函数（`extractFileName`：http/https/file:///带 query/带 hash/中文文件名/无效 URL）已覆盖

**完成判据**：PDF 划词发送后，素材卡片来源显示 `📄 文件名.pdf · 第 N 页`；hover 显示完整路径；网页来源卡片不受影响；三门禁全绿。

## 5. 大 PDF 性能验证（对应 T3.5, D5）

**目标**：>20MB 和 >500 页 PDF 能正常加载、划词、翻页，记录性能指标。

- [ ] 5.1 准备测试样本：① >20MB 的 PDF（如高分辨率扫描件或含大量图片的技术文档）；② >500 页的 PDF（如长篇论文集或书籍）；可从公开来源下载或用脚本生成
- [ ] 5.2 懒加载确认：pdf.js 默认仅渲染可视页 + 预加载相邻页；确认不一次性渲染全部页面（检查 `renderTask` 调用次数）
- [ ] 5.3 性能指标记录（在 validation.md 中填写实际值）：
  - 首屏渲染时间（从 viewer 加载到第一页可见）
  - 翻页延迟（点击下一页到新页可见）
  - 滚动流畅度（快速滚动时是否卡顿/白屏）
  - 内存占用（Chrome 任务管理器中 viewer 标签页的内存）
- [ ] 5.4 性能优化（如需要）：若首屏 >5s 或翻页 >1s，优化 pdf.js 配置（`disableRange`、`disableStream`、`maxCanvasPixels` 等）；优化后重新测量
- [ ] 5.5 大 PDF 划词验证：在 >500 页 PDF 的第 1 页、中间页、最后一页分别划词，确认选区正确、浮动按钮定位正确、素材卡片内容正确
- [ ] 5.6 **L1 单测**：无新增纯函数（性能验证为人工验收）；若有性能相关的配置纯函数则补测

**完成判据**：>20MB 和 >500 页 PDF 均能加载并正常划词；性能指标记录在 validation.md；无崩溃/白屏；三门禁全绿。

## 6. 附 PDF 全文档（对应 T3.6, D9）

**目标**：上下文供给新增"附 PDF 全文"档，pdf.js getTextContent 提取全文，大文档截断，单测覆盖。

- [x] 6.1 【偏差】未创建独立的 `core/selection/pdf-text.ts`，而是在 `PdfViewer` 类中实现 `extractText(startPage, endPage)` 方法——调用 `getTextContent()` 逐页提取文本；页间用 `--- 第 N 页 ---` 分隔
- [x] 6.2 截断策略（D9）：在 viewer `main.ts` 的 `collectPdfFullData()` 中实现——≤50 页取全文；>50 页取 `currentPage-5` 到 `currentPage+5`（边界 clamp）；返回 `{ pdfFull, pdfFullTruncated, pdfFullStartPage, pdfFullEndPage, pdfNoTextLayer }`
- [x] 6.3 viewer 页内采集：划词时预采集 `pdf-full` 档数据（`collectPdfFullData`），随 payload 的 `contextData` 一并发送
- [x] 6.4 素材卡片上下文档位新增"附全文"（仅 PDF 来源卡片显示）；切换后预览区显示提取文本；标注截断信息（"全文过长，已截取第 X-Y 页"）
- [x] 6.5 空文档处理：`extractText` 返回空 → `pdfNoTextLayer: true`；素材卡片显示"此 PDF 无文字层，建议使用「附当前页为图片」（M4）"；prompt 组装时输出提示而非空内容
- [ ] 6.6 token 预览联动：【部分】当前 token 预览只估算 card.text，pdf-full 档的全文 token 未计入；需后续优化 promptBuilder 的 token 估算
- [ ] 6.7 **L1 单测**（强制，roadmap T3.6 标注）：【部分】url/scanned/navigation 纯函数已覆盖；pdf-text 截断逻辑实现在 viewer 类中，未提取为独立纯函数，后续可重构补测
- [ ] 6.8 **L2 单测**：viewer 页内 pdf-full 档采集（后续补）

**完成判据**：PDF 素材卡片可切换到"附 PDF 全文"档；≤50 页显示全文；>50 页显示截取范围标注；空文档显示无文字层提示；token 预览更新；L1 单测覆盖截断边界；三门禁全绿。

## 7. spec 归档与里程碑收尾（对应 T3.7）

**目标**：三件套更新为已实现版，roadmap 回勾，变更记录追加。

- [ ] 7.1 本文 `plan.md` 所有任务组勾选完成
- [ ] 7.2 `requirements.md` 决策表确认无遗漏（实现中新增的决策补入 D 编号）
- [ ] 7.3 `validation.md` 门禁结果填写实际值，人工验收清单全绿
- [ ] 7.4 roadmap.md §5（M3）所有 T3.x 勾选；验收清单勾选；§10 变更记录追加一行
- [ ] 7.5 `CHROMEWEBSTORE.md` 确认 `webNavigation` 权限理由已记录
- [ ] 7.6 最终 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 全绿
