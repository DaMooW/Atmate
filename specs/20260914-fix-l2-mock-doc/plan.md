# L2 mock 文档修正 — Plan

- [x] 1. techniqueStack §1 选型 #11：`@webext-core/mocks` 的 `mockBrowser` → WXT 内置 `wxt/testing/fake-browser` 的 `fakeBrowser`
- [x] 2. techniqueStack §10 L2 表格行：工具列修正
- [x] 3. techniqueStack §10 L2 mock 方案段落：区分 entrypoints（vi.stubGlobal）与 infra 模块（vi.mock），补充 .trigger() / vi.spyOn 用法
- [x] 4. techniqueStack §10 示例代码：替换为两种场景的正确示例
- [x] 5. techniqueStack §10 API 覆盖列表：mockBrowser → fakeBrowser
- [x] 6. techniqueStack §12 ADR-009：同步修正包名与 mock 方式
- [x] 7. AGENTS.md：修正 L2 工具引用
- [x] 8. roadmap §10：追加变更记录
- [x] 9. 验证：pnpm lint（纯文档变更，typecheck/test 不受影响）
