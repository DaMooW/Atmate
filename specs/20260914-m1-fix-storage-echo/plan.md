# M1 修复 · storage 回声竞态 — Plan

> 分支：`20260914-m1-fix-storage-echo` · 依据 [requirements.md](requirements.md) §3 决策 F1–F5
> 测试强制：本修复的 L2 用例写完且 `pnpm test` 全绿才勾选（roadmap §1 DoD）

## 1. 实现（infra/storage/store.ts）

- [x] 1.1 新增本地写入指纹 FIFO：`rememberLocalWrite(key, value)` / `consumeLocalEcho(key, value)`（FNV-1a 32 位 + 长度，上限 512）
- [x] 1.2 `writeKey()` 写前登记指纹
- [x] 1.3 onChanged 监听：命中本地回声则跳过该键；未命中保持既有回流逻辑（含 `undefined` 不回流）
- [x] 1.4 注释写明竞态成因与实测数据，指向本 spec
- [x] 1.5 **指纹键序规范化**（真机复验追加的必需项）：storage 重新序列化后对象键变为字母序，首版直接 `JSON.stringify` 导致 325 次写入 0 命中、缺陷照旧；改为 `sortKeysDeep` + stringify（`stableStringify`）后 312/312 命中

**完成判据**：流式期间内存状态不再倒退；`useStorageStore` 对外接口无变化。

## 2. 测试（L2，tests/infra/storage.test.ts）

- [x] 2.1 滞后的自身回声不把 `sessions` 拉回旧值（本次 bug 的回归用例）
- [x] 2.2 滞后积压回声（50 次写入后回声才追上来）：状态保持最新值
- [x] 2.3 乱序回声（后写先到、先写后到）同样不倒退
- [x] 2.4 外部上下文写入（指纹未登记）仍正常回流（既有用例保持通过）
- [x] 2.5 同一批回流中，本地键被忽略、外部键生效
- [x] 2.6 回声对象键序被重排时仍识别为自身回声（锁定 §1.5）

> 反向验证：移除修复后 2.1/2.2/2.3/2.5 转红；移除键序规范化后 2.6 转红（2026-09-14）。

**完成判据**：新增用例全绿，且原有 storage 用例不回归。

## 3. 文档

- [x] 3.1 techniqueStack §5 同步层描述补充"忽略自身回声"；§12 增 ADR-010
- [x] 3.2 decisionLog 追加 D-011（候选方案、最终采取、重评条款）
- [x] 3.3 roadmap §10 追加变更记录一行
- [x] 3.4 M1 validation §2.2 标注缺陷与复验结论

## 4. 验证

- [x] 4.1 门禁：`pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` 全绿（268 用例）
- [x] 4.2 真机复验：服务端 634 字 ≡ 落库 634 字（同指纹 `e338fdbb`）、代码块渲染 `<pre><code>` + `hljs`、流式期间监控无长度倒退
- [x] 4.3 复验 M1 验收 §2.2 三条（首块可见 ✅ / 表格与代码块渲染 ✅ / 停止生成 ✅）
