# L2 mock 文档修正 — Requirements

> 分支：`20260914-fix-l2-mock-doc` · 日期：2026-09-14
> 关联：techniqueStack §10 / §1 / §12、AGENTS.md、roadmap §10

## 1. 背景

M0 测试补齐（PR #3）过程中发现，techniqueStack §10 对 L2 infra 层测试的描述与实际可行做法有两处偏差：

1. **包名错误**：文档写的是 `@webext-core/mocks` 的 `mockBrowser`，但 npm 上不存在此包。正确的是 WXT 内置的 `wxt/testing/fake-browser`（re-export `@webext-core/fake-browser`），导出 `fakeBrowser`。
2. **mock 方式不完整**：文档只写了 `vi.mock('wxt/browser')`，但这只适用于**显式 import `wxt/browser` 的 infra 模块**。WXT entrypoints（background/content/sidepanel）中的 `browser` 和 `defineBackground` 是构建时**全局注入**的，不是模块导入，必须用 `vi.stubGlobal` 而非 `vi.mock`。此外 fake-browser 的事件用 `.trigger()` 触发、方法需用 `vi.spyOn` 追踪（不是 vi.fn()，没有 `.mock` 属性）。

若不修正，M1 开工时开发者会按文档装不存在的包、用错误的 mock 方式，浪费排查时间。

## 2. 范围

**在范围内：**
- techniqueStack §1 选型 #11：修正包名与导出名
- techniqueStack §10：L2 表格行、mock 方案段落、示例代码、API 覆盖列表——区分 entrypoints（vi.stubGlobal）与 infra 模块（vi.mock），补充 fake-browser API 用法（.trigger() / vi.spyOn）
- techniqueStack §12 ADR-009：同步修正
- AGENTS.md：修正 L2 工具引用
- roadmap §10：追加变更记录

**不在范围内：**
- 不修改任何测试代码（M0 测试已用正确方式）
- 不引入新依赖
- 不修改 vitest.config.ts

## 3. 决策

| # | 决策 | 依据 |
|---|---|---|
| D-022 | L2 工具定为 WXT 内置 `wxt/testing/fake-browser` 的 `fakeBrowser`，不单独装 `@webext-core/fake-browser` | WXT 已 re-export 同包，零额外依赖；版本与 WXT 匹配 |
| D-023 | 区分两种 mock 场景：entrypoints 用 `vi.stubGlobal`，infra 模块用 `vi.mock` | entrypoints 的 browser/defineBackground 是全局注入（M0 测试已验证）；infra 模块显式 import wxt/browser，可用 vi.mock |
| D-024 | 示例代码同时展示两种场景，并注明 fake-browser 的事件用 `.trigger()`、方法用 `vi.spyOn` | fake-browser 不是 vi.fn()，没有 .mock/.mockResolvedValue；M0 测试中已踩坑确认 |
