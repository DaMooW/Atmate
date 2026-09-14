# M0 测试补齐 — Validation

## 1. 自动化门禁

| 命令 | 预期 | 实际 |
|---|---|---|
| `pnpm typecheck` | tsc --noEmit 无错误 | ✅ 2026-09-14 通过 |
| `pnpm lint` | eslint + prettier --check 全绿 | ✅ 2026-09-14 通过（All matched files use Prettier code style） |
| `pnpm test` | vitest run 全绿，用例数 ≥ 15 | ✅ 2026-09-14 通过（4 files / 40 tests passed） |
| `node scripts/generate-icons.mjs` | 生成 4 个 PNG，与提取前行为一致 | ✅ 2026-09-14 通过（输出与原脚本一致；同时发现 git 中原始图标过时，已更新） |

## 2. 人工验收清单

- [x] `scripts/icon-engine.mjs` 存在且导出全部纯函数；`generate-icons.mjs` 改为导入调用，顶层行为不变
- [x] `scripts/icon-engine.d.mts` 类型声明存在，tsc 可识别 .mjs 模块
- [x] `tests/core/icon-engine.test.ts` 覆盖：insideRoundRect、insideTriangle、crc32、encodePng、render 五类（25 用例）
- [x] `tests/infra/background.test.ts` 使用 `vi.stubGlobal` + `wxt/testing/fake-browser`，验证点击图标 → sidePanel.open 与失败路径（3 用例）
- [x] `tests/core/manifest.test.ts` 验证权限最小化、action 无 default_popup、icons 四尺寸、minimum_chrome_version、outDir（8 用例）
- [x] `tests/smoke.test.ts` 已升级为项目结构检查，不再是 "1+1=2"（4 用例）
- [x] 未引入 `@webext-core/fake-browser` 独立依赖（用 WXT 内置 `wxt/testing/fake-browser`）
- [x] 未引入 `@testing-library/react` / jsdom（L3 留到 M1）
- [x] 未修改 M0 业务逻辑（仅纯函数提取 + 过时图标更新）
- [x] 测试目录结构：`tests/core/`、`tests/infra/` 已建立

## 3. 合并判据（Definition of Merged）

- 自动化门禁全绿 + 人工清单全勾；
- 本分支 PR 合回 main；
- **后续待办**：techniqueStack §10 中 L2 的 `vi.mock('wxt/browser')` + `mockBrowser` 描述需修正为实际用法（WXT entrypoints 用 `vi.stubGlobal` + `wxt/testing/fake-browser`；显式 import `wxt/browser` 的 infra 模块才用 `vi.mock`）。此修正可在 M1 spec 中一并处理，或单独小 PR。
