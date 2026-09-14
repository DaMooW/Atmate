# M0 测试补齐 — Requirements

> 分支：`20260914-m0-tests` · 日期：2026-09-14
> 关联：roadmap §1（DoD 测试门禁）、techniqueStack §10（四层测试规范）、specs/20260914-testing-policy/

## 1. 背景

M0 已于 2026-09-13 合并到 main（PR #1），但当时测试规范尚未确立（v0.5 才加入），M0 仅含 `tests/smoke.test.ts` 一个 "1+1=2" 管道冒烟用例。v0.5 规范要求"每个 T*.x 对应测试写完且通过才算完成"，M0 作为已合并里程碑需要回溯补齐测试，同时为 M1 建立测试基础设施（L2 mock 依赖、测试目录结构）。

## 2. 范围

**在范围内：**
- L1：将 `scripts/generate-icons.mjs` 的纯函数提取为可导出模块 `scripts/icon-engine.mjs`，写单测覆盖边界（圆角矩形/三角形包含测试、CRC32 已知值、PNG 编码结构、render 输出尺寸与透明度）
- L2：用 `vi.mock` + `@webext-core/mocks` 的 `mockBrowser` 测 `entrypoints/background.ts`（点击图标 → `sidePanel.open`；失败 → `console.error`）
- L1：manifest 配置验证测试（权限仅 sidePanel、action 无 default_popup、icons 四尺寸、minimum_chrome_version=114）
- 升级 `tests/smoke.test.ts`：从 "1+1=2" 替换为项目结构完整性检查（关键文件存在、vitest 管道可运行）
- 安装 devDependency：`@webext-core/mocks`
- 建立测试目录结构：`tests/core/`、`tests/infra/`

**不在范围内：**
- 不做组件测试（L3，按规范 M1 交互稳定后引入，且 M0 组件均为空壳占位）
- 不做 E2E（L4，M3 后引入）
- 不修改 M0 业务逻辑（仅为可测性做纯函数提取，行为不变）
- 不引入 `@testing-library/react` / jsdom 依赖（L3 留到 M1）
- 不关闭 `passWithNoTests`（M1 收尾时关闭）

## 3. 决策

| # | 决策 | 依据 |
|---|---|---|
| D-017 | icon 纯函数提取到 `scripts/icon-engine.mjs` 并 export，`generate-icons.mjs` 改为导入调用 | 原文件顶层直接执行写文件，无法被 vitest import；提取后行为不变，纯函数可独立测试 |
| D-018 | 保持 `.mjs` 格式而非改 `.ts` | 脚本是纯 Node 运行、不经过 WXT/tsc 构建；`.mjs` 可被 vitest 直接 import；改 TS 需额外处理 `import.meta.url` 与 tsconfig include |
| D-019 | manifest 测试直接 import `wxt.config.ts` 的 default export 检查 `.manifest` 字段，不跑 `pnpm build` | build 慢且依赖完整构建链；config 对象的 manifest 字段是静态声明，直接断言足够覆盖 M0 关键约束 |
| D-020 | background 测试 mock `wxt/browser` 为 mockBrowser，不依赖 WXT 的 `defineBackground` 运行时 | `defineBackground` 是 WXT 编译时宏，Node 环境无法直接执行；测试目标是验证监听器注册与调用逻辑，mock 后手动触发回调即可 |
| D-021 | smoke 测试保留为"项目结构完整性"检查，不删除 | 作为 vitest 管道的最低保障，同时验证关键文件存在性；比 "1+1=2" 有实际意义 |

## 4. 上下文与约束

- **测试规范**：techniqueStack §10 四层金字塔；L2 必须用 `vi.mock` + `mockBrowser`；测试文件放 `tests/core/`、`tests/infra/`；命名 `<模块>.test.ts`。
- **现有配置**：`vitest.config.ts` include `tests/**/*.test.{ts,tsx}`，默认 environment node，`passWithNoTests: true`。
- **`@webext-core/mocks`**：需安装为 devDependency；`mockBrowser` 提供 `action.onClicked.addListener`、`sidePanel.open`、`storage` 等完整替身。
- **background.ts 的 WXT 宏**：`defineBackground`、`browser` 由 WXT 编译时注入。测试时需 `vi.mock('wxt/browser')`，且 `defineBackground` 需要处理——可通过 mock `wxt/client` 或直接测试回调逻辑。实际方案：mock `wxt/browser` 后，import background 模块（其顶层 `defineBackground(() => {...})` 会执行），然后通过 `mockBrowser.action.onClicked.addListener` 获取注册的回调，手动调用触发断言。
- **icon-engine 提取约束**：提取后 `node scripts/generate-icons.mjs` 必须仍能正常生成图标（行为不变）；提取的纯函数不得包含 fs/path 等副作用。
- **CRC32 已知值**：空 Buffer 的 CRC32 = 0x00000000；`Buffer.from('123456789')` 的 CRC32 = 0xCBF43926（标准测试向量）。
- **PNG 结构断言**：前 8 字节为 magic `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]`；IHDR chunk 类型在 offset 12；IEND 在末尾。
