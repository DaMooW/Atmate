# M0 测试补齐 — Plan

> 分支：`20260914-m0-tests` · 回溯补齐 M0（T0.1–T0.5）的测试覆盖

## 任务组 1：基础设施

- [x] 1.1 安装 `@webext-core/mocks` 为 devDependency → **实际调整**：WXT 内置 `wxt/testing/fake-browser`（re-export 同包），无需单独安装，已移除独立依赖
- [x] 1.2 建立测试目录：`tests/core/`、`tests/infra/`
- [x] 1.3 升级 `tests/smoke.test.ts`：替换为项目结构完整性检查（关键源码文件存在、icon 产物存在、规范文档存在、测试目录结构存在）

## 任务组 2：L1 — icon-engine 纯函数单测

- [x] 2.1 提取 `scripts/generate-icons.mjs` 纯函数到 `scripts/icon-engine.mjs` 并 export（insideRoundRect / insideTriangle / crc32 / chunk / encodePng / render / 常量 BADGE/BUBBLE/TAIL/DOTS）
- [x] 2.2 `generate-icons.mjs` 改为从 `icon-engine.mjs` 导入，顶层执行逻辑不变
- [x] 2.3 验证 `node scripts/generate-icons.mjs` 仍能正常生成图标（与原脚本输出一致；同时发现 git 中原始图标过时，已更新为当前脚本产物）
- [x] 2.4 `tests/core/icon-engine.test.ts`：insideRoundRect（矩形内/外、四角圆角内/外、直边略靠内、BADGE 常量）
- [x] 2.5 `tests/core/icon-engine.test.ts`：insideTriangle（重心内/外部、三顶点边界、底边中点）
- [x] 2.6 `tests/core/icon-engine.test.ts`：crc32（空 Buffer = 0、标准向量 '123456789' = 0xCBF43926、单字节 0x00 = 0xd202ef8d）
- [x] 2.7 `tests/core/icon-engine.test.ts`：encodePng（magic bytes、IHDR 尺寸/位深/颜色类型、IEND 结尾、IDAT 可 zlib 解压）
- [x] 2.8 `tests/core/icon-engine.test.ts`：render（输出尺寸、四角透明、中心不透明、气泡区域白色、16px 小尺寸非全零）
- [x] 2.9 补充 `scripts/icon-engine.d.mts` 类型声明（脚本保持 .mjs，测试 import 需类型）

## 任务组 3：L2 — background 行为测试

- [x] 3.1 `tests/infra/background.test.ts`：用 `vi.stubGlobal` 注入 `browser`（fakeBrowser）和 `defineBackground`；动态 import background 模块
- [x] 3.2 断言 `browser.action.onClicked` 注册了监听器（hasListeners）
- [x] 3.3 用 `fakeBrowser.action.onClicked.trigger(tab)` 触发，断言 `sidePanel.open` 被调用且参数为 `{ windowId }`（vi.spyOn 追踪）
- [x] 3.4 模拟 `sidePanel.open` reject，断言 `console.error` 被调用且不抛出
- [x] 3.5 关键发现：WXT entrypoints 的 `browser`/`defineBackground` 是全局注入而非模块导入，需用 `vi.stubGlobal` 而非 `vi.mock`；`vi.resetModules()` 清除动态 import 缓存

## 任务组 4：L1 — manifest 配置验证

- [x] 4.1 `tests/core/manifest.test.ts`：import wxt.config default export，manifest 字段断言为静态对象类型
- [x] 4.2 断言 permissions = ['sidePanel']（权限最小化）
- [x] 4.3 断言 action 存在且无 default_popup（D8 关键约束）
- [x] 4.4 断言 icons 包含 16/32/48/128 四个尺寸
- [x] 4.5 断言 minimum_chrome_version = '114'
- [x] 4.6 断言 name / short_name / description 非空、outDir = 'dist'（D10）

## 任务组 5：验证与收尾

- [x] 5.1 `pnpm typecheck` 通过
- [x] 5.2 `pnpm lint` 通过
- [x] 5.3 `pnpm test` 全绿（40 个用例：icon-engine 25 + manifest 8 + background 3 + smoke 4）
- [x] 5.4 `node scripts/generate-icons.mjs` 重新生成图标，确认与提取前行为一致
- [x] 5.5 roadmap §10 追加变更记录（M0 测试回溯补齐）
- [x] 5.6 勾选本 plan 全部任务
