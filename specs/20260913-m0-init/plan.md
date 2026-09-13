# M0 · 工程初始化 — Plan

> 分支：`20260913-m0-init` · 依据：[roadmap.md §2](../../roadmap.md)（M0）、[mission.md](../../mission.md)、[techniqueStack.md](../../techniqueStack.md)
> 任务组与 roadmap T0.1–T0.5 一一对应；每组完成即在本文勾选，并同步回勾 roadmap.md。

## 1. WXT + React + TS 脚手架（对应 T0.1）

**目标**：`pnpm dev` 可产出可加载的扩展骨架。

- [x] 1.1 初始化 WXT 项目（`pnpm dlx wxt@latest init`，选 React + TypeScript）；确认 `wxt.config.ts`、TS strict 生效
- [x] 1.2 入口骨架：`entrypoints/sidepanel/`（空壳主页）、`entrypoints/background/`（薄路由桩）、`entrypoints/content.ts`（空内容脚本：注入声明先就位 `all_urls` · `document_idle`，main 留空待 M2 填充）；`viewer`、`options` 只留目录与 TODO 注释占位
  - 修订（2026-09-13）：对齐 roadmap T0.1 原文——content 入口在 M0 骨架清单内，初版誊漏（依 roadmap §1：发现偏差先改 spec 再改码）
- [x] 1.3 manifest 生成核对：MV3、`minimum_chrome_version: 114`、permissions 仅 `sidePanel`（M0 阶段最小集，`storage`/`contextMenus` 等随对应里程碑追加）
- [x] 1.4 依赖基线：React 18、zustand 预装（M1 即用）；无业务依赖
- [x] 1.5 冒烟：`pnpm dev` 构建无报错；`dist/` 已入 `.gitignore`
- [x] 1.6 侧边栏入口触发（spec 修订 2026-09-13 / D8）：manifest 增 `action: {}`（且不得有 `default_popup`）；`entrypoints/background.ts` 注册 `action.onClicked` → `sidePanel.open({ windowId })`，工具栏图标可直接打开空面板
- [x] 1.7 扩展图标（spec 修订 2026-09-13 / D9）：`scripts/generate-icons.mjs` 生成 16/32/48/128 真实 PNG 到 `public/icon/`；manifest 声明 `icons` + `action.default_icon` + `action.default_title`；构建产物核对图片确实被打包且尺寸正确
- [x] 1.8 产物目录改为非隐藏目录（spec 修订 2026-09-13 / D10）：`wxt.config.ts` 设 `outDir: 'dist'`；`.gitignore` 与 eslint 忽略项同步；文档路径引用同步；删除旧 `.output/`；核对产物为 `dist/chrome-mv3`

## 2. Tailwind v4 接入与深浅色 token（对应 T0.2）

**目标**：样式基建就绪，M1 起只需写组件。

- [x] 2.1 Tailwind v4（`@tailwindcss/vite` 插件方式接入 WXT 的 Vite）＋ Prettier 配色类插件（建议 `prettier-plugin-tailwindcss`）
- [x] 2.2 全局 CSS 定义颜色语义 token（`--color-bg / text / primary / border` 等基面变量）作为 Tailwind theme 源
- [x] 2.3 深浅色双形态：`:root` 浅色、`.dark`（或 `prefers-color-scheme`）深色；M0 只要求 token 就绪，切换交互留给后续里程碑
- [x] 2.4 验证：sidepanel 空壳页在两种形态下背景/文字正常

## 3. 质量门禁三件套（对应 T0.3）

**目标**：`tsc` / `eslint` / `vitest` 三条命令全绿并接入 scripts。

- [x] 3.1 `typescript` — `pnpm tsc --noEmit` 通过（strict，含 WXT 生成的 env dts）
- [x] 3.2 ESLint：采用 `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks`；风格规则交 Prettier，ESLint 不重复管格式
- [x] 3.3 Prettier 入链（eslint-config-prettier 结尾）；`pnpm lint` 同时跑 eslint+prettier（或分列）
- [x] 3.4 vitest 就位（M0 无业务逻辑，允许 0 用例，仅为管道畅通；`pnpm test` 可空跑）
- [x] 3.5 `package.json` scripts 齐备：`dev / build / compile / lint / typecheck / test`；本地 pre-commit 钩子（simple-git-hooks + lint-staged 或等价物），CI 暂缓
- [x] 3.6 门禁演示：故意引入一处类型错误与一处 lint 违例，确认分别被 `typecheck`/`lint` 拦下（验证后还原）

## 4. 空壳组件层级（对应 T0.4）

**目标**：tech §4 层级落地为占位组件，M1 在此之上填肉。

- [x] 4.1 按技术文档层级创建占位组件：`App` / `Sidebar` / `Main`（含对话视图骨架的空 `MessageList`、`Composer`、`TokenStatusBar` 挂点位）
- [x] 4.2 sidepanel 入口只挂 `<App/>`，无业务逻辑
- [x] 4.3 占位组件带 TODO 边界注释（标注对应 FR/T 编号），防止越界实现

## 5. 收尾：specs 目录、README 与 git（对应 T0.5）

**目标**：repo 可长期协作。

- [x] 5.1 `specs/` 目录 + 模板文件（背景 → 范围 → 交互稿 → 数据与接口变更 → 边界与异常 → 验收清单）落地（本目录即首个实例）
- [x] 5.2 `README.md`：一段话 + 四文档链接（mission / roadmap / techniqueStack / decisionLog）
- [x] 5.3 `git init` 已完成（既有仓库）；.gitignore 核对（node_modules / .output / .wxt 等）
- [x] 5.4 spec 归档：`spec 归档：M0 工程初始化` 记入 roadmap.md §10 变更记录

---

## 完成记录（2026-09-13）

任务组 1–5 全部完成（22/22），roadmap T0.1–T0.5 已回勾。

- 门禁：`pnpm typecheck` / `pnpm lint` / `pnpm test` 全绿；埋错演示确认三门禁均有拦截力。
- 构建：`pnpm build` → `dist/chrome-mv3`；manifest 核对通过（MV3 / `minimum_chrome_version: 114` / permissions 仅 `sidePanel`）。
- dev：`pnpm dev` 正常启动（`http://localhost:3000` → `dist/chrome-mv3-dev`）。
- 待人工核验：Chrome 加载未打包扩展与 HMR（步骤见 [validation.md §4](validation.md)）。

### 验收期修订

- **D8 · 侧边栏入口触发**（2026-09-13）：初版漏掉"声明 `side_panel` ≠ 面板可打开"这一条，验收时才发现工具栏图标点不出面板。已按「先改 spec 再改码」补正：见 [requirements.md](requirements.md) 修订记录、任务 1.6、[validation.md](validation.md) §1.1 与 §2。
