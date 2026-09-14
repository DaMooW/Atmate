# 测试规范确立 — Validation

## 1. 自动化门禁

| 命令 | 预期 | 实际 |
|---|---|---|
| `pnpm typecheck` | tsc --noEmit 无错误 | ✅ 2026-09-14 通过（WXT prepare + tsc 834ms） |
| `pnpm lint` | eslint + prettier --check 全绿 | ✅ 2026-09-14 通过（All matched files use Prettier code style） |
| `pnpm test` | vitest run 全绿（smoke 用例） | ✅ 2026-09-14 通过（1 test file / 1 test passed） |

## 2. 人工验收清单

- [x] roadmap §1 的 DoD 明确要求"每个 T*.x 对应测试写完且通过"，且引用了 techniqueStack §10
- [x] roadmap 各里程碑中涉及核心逻辑的任务项均有测试标注（单测/边界用例）
- [x] techniqueStack §10 包含四层测试金字塔表格，每层写明：测什么、工具、环境、覆盖重点
- [x] techniqueStack §10 明确 L2 采用 `vi.mock` + `@webext-core/mocks` 的 `mockBrowser`，并给出示例片段
- [x] techniqueStack §10 包含测试目录约定（`tests/core/`、`tests/infra/`、`tests/components/`）与文件命名规则
- [x] techniqueStack §10 包含边界用例强制清单（空选区、超长文本、断流、畸形 chunk、损坏图片、schema 迁移等）
- [x] techniqueStack §12 有 ADR-009，说明分层策略与 L2 选型理由
- [x] `vitest.config.ts` 默认 node 环境，注释说明组件测试用 `// @vitest-environment jsdom` 文件头切换
- [x] `AGENTS.md` 开发流程 DoD 同步了测试要求
- [x] 本次变更未引入任何业务代码或新依赖（仅文档 + vitest 配置）

## 3. 合并判据（Definition of Merged）

- 上述自动化门禁全绿 + 人工清单全勾；
- 本分支合回 `20260913-m0-init`（或直接合 main，视 M0 合并进度），合并后删除分支；
- M1 开工时的 spec 必须引用本规范，plan.md 中每个任务组须写明对应测试文件。
