# M0 · 工程初始化 — Validation

> 依据 [roadmap.md §2](../../roadmap.md) M0 验收标准与 §1 DoD。合并判据（评审 Q4）：三条门禁命令全绿 + 人工验收清单核验。

## 1. 门禁（自动化）

| 命令 | 预期 | 结果 |
|---|---|---|
| `pnpm typecheck`（tsc --noEmit，strict） | 0 错误 | ✅ 2026-09-13，0 错误 |
| `pnpm lint`（eslint + prettier） | 0 违例 | ✅ 2026-09-13，`All matched files use Prettier code style!` |
| `pnpm test`（vitest run，M0 可 0 用例） | 退出码 0 | ✅ 2026-09-13，1 passed |

### 1.1 附加证据（超出最低要求，供验收人复核）

- **构建**：`pnpm build` 通过 → `.output/chrome-mv3`（MV3，151.46 kB）。
- **manifest 核对**（plan 1.3）：`manifest_version: 3`、`minimum_chrome_version: "114"`、`permissions: ["sidePanel"]` 仅此一项、`side_panel.default_path: sidepanel.html`、content script `matches: ["<all_urls>"]` + `run_at: document_idle`、`version: 0.1.0`。
- **dev 冒烟**（plan 1.5）：`pnpm dev` 正常启动，dev 服务器 `http://localhost:3000`，产出 `.output/chrome-mv3-dev`，无报错。
- **样式 token**（plan 2.4 / T0.2）：构建产物 CSS 中语义工具类已生效（`.bg-surface{background-color:var(--surface)}`、`.border-border{border-color:var(--line)}`），且 `prefers-color-scheme` 深浅两套变量均在位（`--bg:#f6f6f4` / `--bg:#101418`）。
- **真实渲染**（plan 2.4）：在浏览器打开 dev 页面核验（地址 `http://localhost:3000/entrypoints/sidepanel/index.html`；注意 dev 服务器**根路径返回 404**，须带 entrypoint 路径）。结果：React 已挂载（`#root` 有 1 个子节点）；语义 token 生效——侧栏背景 `rgb(21,25,30)` 即 `--surface`、右边框 `rgb(61,68,77)` 即 `--line`、宽度 64px 即 `w-16`；`main` 为 flex 列。当前命中系统深色偏好（`prefersDark: true`，`--bg:#101418`）；浅色分支由同一套变量 + 媒体查询覆盖，两套值均已确认在产物 CSS 中。
- **门禁演示**（plan 3.6）：临时植入 `any` + 未使用变量 + 类型不符的文件后，`typecheck` 报 `error TS2322`、`eslint` 报 2 处 error；删除探针文件后三条门禁恢复全绿。
- **侧边栏入口**（D8）：产物 manifest 含 `"action": {}` 且**无** `default_popup`；`background.js` 中已注册 `action.onClicked` → `sidePanel.open({ windowId })`。

## 2. 人工验收（roadmap M0 原文）

- [ ] Chrome 114+ 加载未打包扩展，**点击工具栏图标**能打开空 sidepanel（D8 修订后图标为主通道；修订前只能从侧边栏自带的扩展下拉里选到）
- [ ] 改代码 HMR 生效
- [x] 三条门禁命令全绿（含故意埋错被拦截的演示，见 plan 3.6）— 2026-09-13 完成

> 前两项需在 Chrome 内人工完成；构建产物路径见 §4 复现步骤第 2 步。

## 3. 合并清单（Definition of Merged）

- [x] plan.md 任务组 1–5 全部勾选（22/22）
- [x] roadmap.md 中 T0.1–T0.5 已回勾，§10 追加一行变更记录
- [x] requirements.md 无悬而未决的范围变更（含则改本文再合）
- [ ] 合并方式：分支合回 `main` 后删除分支；分支名与目录名一致（`20260913-m0-init`）

## 4. 复现步骤（验收人按此走查）

1. `pnpm install && pnpm dev`
2. Chrome → `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `.output/chrome-mv3`（确认空 sidepanel 可打开）
3. 任意改动 sidepanel 文案保存，确认页面免刷新更新（HMR）
4. 依次跑 `pnpm typecheck / lint / test`
5. 核对 manifest：MV3、`minimum_chrome_version` 指向 114、permissions 仅 `sidePanel`
