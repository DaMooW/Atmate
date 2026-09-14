# L2 mock 文档修正 — Validation

## 自动化门禁
| 命令 | 预期 | 实际 |
|---|---|---|
| `pnpm lint` | 全绿 | ✅ 2026-09-14 通过 |

## 人工验收
- [x] techniqueStack §1 选型 #11 包名正确（wxt/testing/fake-browser / fakeBrowser）
- [x] techniqueStack §10 区分了 entrypoints（vi.stubGlobal）与 infra 模块（vi.mock）两种场景
- [x] techniqueStack §10 示例代码可直接复制使用（import 路径正确、API 调用正确）
- [x] techniqueStack §10 注明了 fake-browser 事件用 .trigger()、方法用 vi.spyOn
- [x] ADR-009、AGENTS.md 同步修正
- [x] roadmap §10 有变更记录
- [x] 顺带修正 §10 typo `passWithNoTests: tLrue` → `true`
