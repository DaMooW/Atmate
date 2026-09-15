# Chrome Web Store Listing — 在伴 Atmate

> Last Updated: 2026-09-15
> 状态：**草案**（产品尚在 M2 阶段，多数文案待功能成型后定稿）
> 维护约定见 [AGENTS.md](AGENTS.md)：改动扩展（尤其权限）后同步更新本文件。

## Store Listing

**Extension Name** [REQUIRED]

在伴 Atmate
<!-- 须与 manifest.json 的 name 一致；≤75 字符。当前 manifest: "在伴 Atmate" -->

**Short Description** [REQUIRED]

划取网页或 PDF 上的内容，交给你的 AI 角色流式处理；自备 API Key，本地存储，无遥测。
<!-- ≤132 字符。定稿前复核字数。 -->

**Detailed Description** [REQUIRED]

*（草案，待 M2 划词链路完成后定稿）*

在任意网页或 PDF 上选中一段文字或一张图，点一下浮动按钮，它就会出现在侧边栏里，交给一个你定义好的 AI 角色处理——翻译、解读、摘要、追问都行。

**用你已有的 AI 服务**：填上你自己的接口地址与密钥即可，支持各类 OpenAI 兼容服务，也可以连本地模型。密钥只存在你自己的浏览器里。

**角色由你定义**：把常用的要求存成角色（比如"按前端术语翻译"、"审这篇论文的方法部分"），下次直接选用，不必每次重新交代。

**每次都看得见花销**：侧边栏顶部常驻显示当前上下文占用了多少、上限还剩多少，接近上限时提前提醒，而不是悄悄截断。

**用法**：选中内容 → 点击浮动按钮（或右键菜单）→ 在侧边栏补充说明 → 选择角色 → 发送。

**隐私**：不做数据收集、不做行为统计，内容只发往你自己配置的接口。

**Category** [REQUIRED]

Productivity（生产力工具）

**Single Purpose** [REQUIRED]

把网页与 PDF 上选中的内容，交给用户自己配置的 AI 角色处理。

**Primary Language** [REQUIRED]

Chinese (Simplified)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icon/128.png`（由 `scripts/generate-icons.mjs` 生成，另有 16/32/48） |
| Screenshot 1 [REQUIRED] | 1280×800 或 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 或 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes

- 图 1：网页上划词的浮动按钮 + 侧边栏收到素材卡片（体现核心链路）
- 图 2：侧边栏流式输出 + 顶部 token 状态条（体现"看得见花销"）

## Permissions Justification

<!-- 当前 manifest 声明 sidePanel + storage + contextMenus（M2，见 specs/20260915-m2-selection-integration）。 -->

| Permission | Type | Justification |
|------------|------|---------------|
| `sidePanel` | permissions | 本扩展的界面就是浏览器的侧边栏：划取的内容、AI 的回复和 token 用量都在侧边栏内展示。没有这项权限就无法显示主界面。 |
| `storage` | permissions | 在本机保存会话历史、角色预设与 API 配置（含 API Key）。所有数据仅存 chrome.storage.local，不上云、不同步、不遥测（NFR-2）。 |
| `contextMenus` | permissions | 提供"发送选中内容到在伴 AI 侧边栏"右键菜单项，作为浮动按钮的替代入口。用户选中文字后右键即可发送，无需寻找浮动按钮。 |

### 计划追加（**尚未写入 manifest**，随对应里程碑申请，届时补写理由）

| Permission | 计划里程碑 | 计划理由（待定稿） |
|------------|-----------|-------------------|
| `unlimitedStorage` | M4 | 图片等二进制素材缓存在本机，避免配额限制 |
| `<all_urls>`（host_permissions） | M1/M2 | 用户在任意网站划词、并直连用户自配的接口地址；PDF 页需读取文件字节 |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No
<!-- 开发者不收集、不接收任何数据：无遥测、无后端、无账号。 -->

但需如实说明**数据去向**：用户划取的内容会连同提示词一起，由浏览器直接发送到**用户自己配置的接口地址**（可能是第三方 AI 服务，也可能是本机模型）。扩展开发者不经手这些数据，也没有任何服务器。

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Website content | 否（开发者不收集） | 是，仅发往用户自配的接口 | 完成用户请求的处理 | 否（由用户自行选择的服务接收） |
| Authentication info | 否 | 是（API Key，仅发往用户自配的接口） | 接口鉴权 | 否 |
| User activity | 否 | 否 | — | 否 |
| Web history / Location / Health / Financial / PII / Personal communications | 否 | 否 | — | 否 |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

待定稿（上架前需托管在可公开访问的地址；可参考 `chrome-extensions` 技能 `references/webstore/privacy-policy.md`）

## Distribution

**Visibility**: 待定（个人使用考虑 Unlisted；若开源发布则 Public）
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED] 待填

**Contact Email** [REQUIRED] 待填

**Support URL / Email** [RECOMMENDED] 待填

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-09-13 | M0 工程骨架：侧边栏空壳、工具栏图标打开侧边栏（无业务功能，未提审） | Draft |

## Review Notes

### Known Issues / Limitations

- 0.1.0 不含任何业务功能，仅为骨架版本，**不打算提交审核**。
- 扩展无内置模型：所有 AI 能力依赖用户自配的接口；上架文案与隐私政策须随功能落地同步更新。

### Rejection History

（暂无）
