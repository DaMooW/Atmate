# 测试规范确立 — Requirements

> 分支：`20260914-testing-policy` · 日期：2026-09-14
> 关联：roadmap §1（开发流程约定）、techniqueStack §10（工程化）

## 1. 背景

M0 已打通 vitest 管道（`tests/smoke.test.ts`，`passWithNoTests: true`），但尚未确立分层测试策略。M1 将引入 `core/` 域层与 `infra/` 接入层，届时大量纯函数与 chrome API 边界代码需要测试覆盖。若不在开工前明确规范，容易出现：

- 测试只写 happy path，边界（断流、畸形 chunk、空选区、超长文本）无人覆盖；
- infra 层与 `chrome.*` API 强耦合，Node 环境跑不起来，被迫全部手动验证；
- 各里程碑对"写完测试"的理解不一致，有人认为跑通 smoke 就算，有人要求组件级覆盖；
- 组件测试与域层测试混在同一环境，配置混乱。

本次里程碑确立**四层测试金字塔**与**测试门禁规则**，作为 M1 起所有里程碑的强制约束。

## 2. 范围

**在范围内：**
- roadmap §1 开发流程约定中增加"测试完成定义"与提交门禁；
- techniqueStack §10 工程化中增加完整测试规范（分层、工具、目录、环境、边界用例要求）；
- techniqueStack §1 选型总表增加测试工具选型行；
- 新增 ADR-009（测试分层策略与 L2 mock 方案选型）；
- `vitest.config.ts` 补充 jsdom 环境匹配规则与测试目录约定（为 M1 组件测试预留）；
- `AGENTS.md` 开发流程段同步引用测试规范。

**不在范围内：**
- 不写任何真实业务单测（M1 随 core 层一起写）；
- 不引入 Playwright / E2E 框架（M3 左右再评估，见规范 L4）；
- 不引入 `@testing-library/react` 等组件测试依赖（M1 交互稳定后再加）；
- 不修改现有 smoke 测试。

## 3. 决策

| # | 决策 | 依据 |
|---|---|---|
| D-011 | 采用四层测试金字塔：L1 core 单测（node）· L2 infra 单测（node + mock chrome）· L3 组件测试（jsdom）· L4 E2E（真实 Chrome，后期） | Chrome 扩展多上下文、强依赖 chrome API；越底层越容易测、ROI 越高；L4 成本最高只覆盖关键路径 |
| D-012 | L2 infra 层采用 `vi.mock` 直接 mock + `@webext-core/mocks` 的 `mockBrowser` 批量 mock（方案 B），不采用依赖注入（方案 A） | 项目规模小、infra 层薄；方案 B 写得快、与 WXT 生态一致；`mockBrowser` 提供完整 chrome API 替身，避免手写字段遗漏 |
| D-013 | 测试文件统一放 `tests/` 下按层分子目录（`tests/core/`、`tests/infra/`、`tests/components/`），不与源码同目录 | 现有 `vitest.config.ts` 已约定 `tests/**/*.test.ts`；集中管理便于按目录匹配环境 |
| D-014 | vitest 环境默认 node；L3 组件测试在文件顶部加 `// @vitest-environment jsdom` 逐文件切换 | vitest 5 已移除 `environmentMatchGlobs`；文件头注释是官方 per-file 切换方式，比拆 projects 配置简洁；组件测试文件数量少（~15%），逐文件加注释成本低 |
| D-015 | 每个 T*.x 任务完成时，对应测试必须写完且通过，否则不得勾选该任务、不得提交 | 防止"先写代码后补测试"演变为"永远不补"；测试是任务完成的必要条件而非附加项 |
| D-016 | `passWithNoTests` 在 M1 收尾时关闭 | M0 允许空跑是管道搭建期的过渡；M1 起 core 层有真实用例，空跑应视为配置错误 |

## 4. 上下文与约束

- **现有配置**：`vitest.config.ts` 已设 `include: ['tests/**/*.test.ts']`、`environment: 'node'`、`passWithNoTests: true`；`package.json` 有 `test: vitest run`，pre-commit 跑 lint-staged（不跑 test，test 靠手动/CI）。
- **WXT 测试生态**：WXT 官方文档推荐 vitest + `@webext-core/mocks`；`wxt/browser` 模块在测试环境中可被 `vi.mock` 替换。
- **chrome API 覆盖面**：本项目用到 `storage.local`、`storage.onChanged`、`runtime.sendMessage`、`runtime.onMessage`、`sidePanel.open`、`contextMenus`、`commands`、`webNavigation`——`mockBrowser` 均有对应 mock。
- **边界用例强制清单**（techniqueStack §10 已点名，本次细化到各层）：空选区、超长文本、断流、畸形 SSE chunk、`[DONE]` 异常位置、损坏图片字节、storage schema 旧版本迁移、`collectUsage` 探测降级。
- **不做 E2E 的原因**：M1~M2 交互仍在变动，E2E 用例重写成本高；Playwright 加载扩展的配置在 M3 主流程稳定后再引入。
