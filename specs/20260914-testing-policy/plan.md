# 测试规范确立 — Plan

> 分支：`20260914-testing-policy` · 与 roadmap 任务对应（本里程碑为流程规范类，不对应 T*.x，完成后在 roadmap §10 追加变更记录）

## 任务组 1：roadmap.md 修订

- [x] 1.1 §1 开发流程约定：DoD 中"核心新逻辑有单测"替换为明确的"测试完成定义"（引用 techniqueStack §10 四层规范；每个 T*.x 对应测试写完且通过才算完成）
- [x] 1.2 §1 增加提交门禁说明：无对应测试的代码变更不得勾选任务、不得提交（pre-commit 已跑 lint，vitest 靠 `pnpm test` 手动/CI 核验）
- [x] 1.3 各里程碑任务项中已有"单测"标注的保留并统一措辞；未标注但涉及核心逻辑的补充标注（M1 T1.1/T1.4/T1.8/T1.9 已有；M2 T2.1/T2.6 补；M3 T3.6 补；M4 T4.1/T4.3 已有；M5 T5.1/T5.5 补）
- [x] 1.4 §10 变更记录追加一行（v0.5：测试规范确立）

## 任务组 2：techniqueStack.md 修订

- [x] 2.1 §1 选型总表增加 #11 测试工具行（vitest + @webext-core/mocks + @testing-library/react（M1 后）+ Playwright（M3 后））
- [x] 2.2 §10 工程化：将原有"质量门禁"一段扩充为完整测试规范小节，包含四层金字塔表格、各层工具与环境、L2 mock 方案说明、目录约定、边界用例强制清单
- [x] 2.3 §12 增加 ADR-009（测试分层策略与 L2 mock 方案选型）
- [x] 2.4 版本头更新为 v0.5，追加变更说明

## 任务组 3：vitest.config.ts 与 AGENTS.md 同步

- [x] 3.1 `vitest.config.ts`：`include` 扩展支持 `.tsx`；默认 environment node；注释说明 L3 组件测试用文件头 `// @vitest-environment jsdom` 切换（vitest 5 无 environmentMatchGlobs）；保留 `passWithNoTests: true` 并加注释说明 M1 收尾时关闭
- [x] 3.2 `AGENTS.md` 开发流程段：DoD 中补充"对应测试已写完且通过"，引用 techniqueStack §10

## 任务组 4：验证

- [x] 4.1 `pnpm typecheck` 通过
- [x] 4.2 `pnpm lint` 通过
- [x] 4.3 `pnpm test` 通过（smoke 用例仍绿）
- [x] 4.4 人工核验：roadmap §1、techniqueStack §10/§12、vitest.config.ts 三处规范一致无矛盾
