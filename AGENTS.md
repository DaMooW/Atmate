# AGENTS.md — 本仓库的智能体须知

## 项目

**在伴 Atmate**：Chrome 侧边栏 AI 角色助手（划词发送 · 流式应答 · token 可见）。

- 范围与需求：[mission.md](mission.md)
- 阶段计划与验收：[roadmap.md](roadmap.md) ← **动手前先看当前里程碑**
- 技术约束：[techniqueStack.md](techniqueStack.md)
- 决策背景：[decisionLog.md](decisionLog.md)

## 开发流程（spec-first，见 roadmap §1）

- 每个里程碑开工前先出目录 `specs/<YYYYMMDD>-<slug>/`（与分支同名），三件套：`requirements.md`（背景 / 范围 / 决策 / 上下文）、`plan.md`（编号任务组，对齐 roadmap 的 T*.x）、`validation.md`（验收与合并判据）。模板见 [specs/TEMPLATE.md](specs/TEMPLATE.md)。
- 评审通过才动代码；实现中发现与 spec 不符，**先改 spec 再改码**。
- 完成一项即勾选 `plan.md` 并回勾 `roadmap.md`；**勾选前确认对应测试已写完且 `pnpm test` 全绿**（测试规范见 techniqueStack §10 四层金字塔；L2 infra 用 WXT 内置 `wxt/testing/fake-browser` 的 `fakeBrowser`，entrypoints 用 `vi.stubGlobal`、infra 模块用 `vi.mock`）；里程碑收尾在 roadmap §10 追加一行变更记录。
- 合并门槛：门禁全绿 + 每个 T*.x 对应测试通过 + roadmap 验收清单人工核验。

## Chrome 扩展开发约定

- **先查技能**：涉及扩展 API（manifest、side panel、content script、service worker、存储、消息传递、右键菜单、权限…）时，先读已安装的 `chrome-extensions` 技能及其 `references/`；写 HTML/CSS/客户端 JS 前先查 `modern-web-guidance` 技能。
- **维护 `CHROMEWEBSTORE.md`**：创建或修改扩展时，同步创建/更新仓库根目录的 `CHROMEWEBSTORE.md`，用于记录商店文案与 **每项权限的理由说明**。字段与模板见 `chrome-extensions` 技能的 `references/webstore/chromewebstore-template.md`。
- **权限最小化**：新增权限须在对应里程碑申请并写明理由（当前仅 `sidePanel`）。
- **产物目录用非隐藏的 `dist/`**（不用 WXT 默认的 `.output/`）：点开头的隐藏目录在访达与"加载已解压的扩展程序"的文件选择框里都看不见，用户选不到产物。
- **诚实优先**：平台不支持的能力明确标注不可用并说明原因，不做"假装支持"。

## 失误记录

本项目维护 [mistakeLog.md](mistakeLog.md)：记录**智能体自身**造成的、可避免的操作事故（不是产品决策分歧，决策记 [decisionLog.md](decisionLog.md)）。格式与字段见该文件开头约定（M-XXX 递增、只追加、必须写可执行的预防规则）。发现自己造成的问题 → 当天补记。

## 常用命令

```bash
pnpm dev        # WXT 开发服务器 + 开发版扩展（dist/chrome-mv3-dev）
pnpm build      # 生产构建（dist/chrome-mv3）
pnpm typecheck  # tsc --noEmit（strict）
pnpm lint       # eslint + prettier --check
pnpm test       # vitest run
```
