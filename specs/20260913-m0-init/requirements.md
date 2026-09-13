# M0 · 工程初始化 — Requirements

> 评审定案（2026-09-13，AskUserQuestion）：目录进 specs/ 体系、plan 五组对齐 roadmap、范围严格按 roadmap 不增项、合并判据为门禁+人工验收。

## Scope（范围）

源自 [roadmap.md §2](../../roadmap.md) M0，固定为 T0.1–T0.5，一人日预算：

- WXT + React + TS(strict) 脚手架；入口 sidepanel / background 有内容，viewer、options 留桩
- Tailwind v4 + 深浅色颜色 token（仅 token 就绪，不含切换交互）
- 门禁三件套（tsc / eslint / prettier+vitest 管道）接入 scripts 与本地 pre-commit
- 空壳组件层级：App / Sidebar / Main 占位（tech §4）
- `specs/` 目录 + 模板 + README（一段话 + 四文档链接）

**明确不做（本里程碑）**：

- 主题手动切换交互、lint-staged 增强等一切增量项（评审选「不增项」）
- 任何业务功能——无 content script、无会话/角色/配置逻辑（M1 起）
- CI 流水线（roadmap 明示暂缓）
- `storage` / `contextMenus` / `unlimitedStorage` 等权限（随对应里程碑申请）

## Decisions（关键决策）

| # | 决策 | 依据 |
|---|---|---|
| D1 | feature 目录 = `specs/<YYYYMMDD>-<slug>/`，与分支同名，本例 `20260913-m0-init` | 评审 Q1：沿用 spec-first，本目录即规格与验收落点，替代原单文件 spec 约定（roadmap §1 相应微调） |
| D2 | plan 分五组，一一对应 roadmap T0.1–T0.5，完成即回勾 roadmap | 评审 Q2：组间边界清晰、可逐项核销 |
| D3 | M0 范围严格 = T0.1–T0.5，不增项（主题切换、lint-staged、双语 README 均缓） | 评审 Q3；防止稀释 1 人日预算 |
| D4 | 合并门槛 = 门禁全绿 + roadmap M0 验收清单人工核验（Chrome 加载、空 sidepanel、HMR） | 评审 Q4；与 roadmap DoD 对齐 |
| D5 | pre-commit 用 simple-git-hooks + lint-staged（或等价轻量物）实现「本地 pre-commit 即可」 | roadmap T0.3 原文；不增 CI |
| D6 | ESLint 只管代码质量，格式交 Prettier（eslint-config-prettier 结尾），避免规则打架 | tech §10 工程化约束 |
| D7 | M0 的 manifest permsissions 只声明 `sidePanel`；其余权限随里程碑逐次追加 | 最小权限起步；tech §3 全量清单是终态 |
| D8 | **spec 修订（2026-09-13，验收期发现）**：范围追加"侧边栏入口触发"——manifest 增 `action`，service worker 用 `chrome.action.onClicked` → `chrome.sidePanel.open({ windowId })` 打开面板 | 原范围只声明 `side_panel.default_path`，而"声明本身不等于可打开"：工具栏图标点不出面板，M0 验收"能看到空 sidepanel"实际要靠 Chrome 侧边栏自带下拉。依 roadmap §1「发现偏差先改 spec 再改码」补正；依据见 `chrome-extensions` 技能必守规则 2 / 11 |

### 修订记录（验收期）

- **2026-09-13 · D8 · 侧边栏入口触发**
  - **问题**：`"side_panel": { "default_path": ... }` 不会让面板可打开，必须另有触发点（`chrome-extensions` 技能列为最常见的"扩展一上来就是坏的"原因之一）。
  - **采取**：`wxt.config.ts` 的 manifest 增 `action: {}`；`entrypoints/background.ts` 注册 `chrome.action.onClicked` → `chrome.sidePanel.open({ windowId })`。
  - **为何用 `action.onClicked` 而非 `setPanelBehavior`**：前者留出钩子，M1/M2 可在"打开面板"前后做落点判定（如无激活会话则新建），后者只是一行开关、无回调。
  - **连带**：manifest 不声明 `default_popup`（否则 `action.onClicked` 不触发）；不新增任何**权限**——`action` 是 manifest 键而非权限，**D7 不变**。
  - **影响文件**：`wxt.config.ts`、`entrypoints/background.ts`、本目录 `plan.md`（新增 1.6）、`validation.md`（新增核验项）。

## Context（背景与约束）

- 本仓库现阶段只有产品文档（mission / roadmap / techniqueStack / decisionLog），本分支是**第一行代码**的落点。
- 技术底座已在 techniqueStack.md §1 定死：WXT + React 18 + TS strict + Tailwind v4 + zustand；M0 不得偏离（改选型须走 ADR）。
- 目录遵循 tech §10 WXT 约定：`entrypoints/ components/ core/ infra/ locales/ assets/ specs/ tests/`；M0 只需其中 `entrypoints/ components/ specs/`，其余留空目录或暂不创建。
- Chrome 最低 114（Side Panel API）；`pnpm` 为包管理器。
- 下一步：M1 侧边栏对话 MVP（roadmap §3），其所有任务在本 M0 骨架之上展开。
