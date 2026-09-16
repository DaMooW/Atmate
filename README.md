# 在伴 Atmate

Chrome 侧边栏 AI 角色助手：在任意网页与 PDF 上划取内容，配上自定义 AI 角色，即可获得流式的 LLM 输出（翻译、解读、摘要、追问……），并对 token 用量与上下文占用一目了然。自备 API Key、本地存储、无遥测。

## 功能特性

- **划词即发**：在任意网页选中文字，点击浮动按钮或右键菜单，内容自动填入侧边栏
- **PDF 原生支持**：打开 PDF 时可选择用扩展自建查看页打开，支持划词发送、附全文上下文；扫描件（无文字层）自动检测并提醒
- **自定义 AI 角色**：把常用的要求存成角色（如"按前端术语翻译"、"审这篇论文的方法部分"），下次直接选用
- **自备接口**：填入你自己的 OpenAI 兼容接口地址与密钥即可，支持本地模型；密钥只存在你自己的浏览器里
- **流式应答**：逐字输出，不用等完整响应
- **Token 可见**：侧边栏顶部常驻显示当前上下文占用了多少 token、上限还剩多少
- **隐私优先**：不收集数据、不做行为统计，内容只发往你自己配置的接口；代码完全开源

## 安装

### 方式一：从 GitHub Release 下载（推荐普通用户）

1. 前往 [Releases 页面](https://github.com/DaMooW/Atmate/releases)，下载最新版本的 `atmate-*.zip`
2. 解压到一个固定的文件夹（比如 `~/Applications/Atmate`）
3. 打开 Chrome，地址栏输入 `chrome://extensions`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」，选择刚才解压的文件夹
6. 扩展安装完成！点击工具栏的扩展图标即可打开侧边栏

> **注意**：通过这种方式安装的扩展不会自动更新。有新版本时，重新下载 zip、替换文件夹、在 `chrome://extensions` 点击刷新按钮即可。

### 方式二：从源码构建（推荐开发者）

```bash
# 克隆仓库
git clone https://github.com/DaMooW/Atmate.git
cd Atmate

# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 产物在 dist/chrome-mv3/，按方式一的第 3-6 步加载
```

## 快速开始

1. 点击扩展图标打开侧边栏
2. 进入设置页，填入你的 API 接口地址、API Key 和模型名称
3. 创建一个角色（或使用默认角色）
4. 在任意网页上选中一段文字，点击浮动的「在伴」按钮
5. 内容自动填入侧边栏，补充说明后点击发送

## 文档

- 产品范围：[mission.md](mission.md)
- 阶段计划：[roadmap.md](roadmap.md)
- 技术约束：[techniqueStack.md](techniqueStack.md)
- 决策日志：[decisionLog.md](decisionLog.md)
- 隐私政策：[PRIVACY.md](PRIVACY.md)
- 商店文案：[CHROMEWEBSTORE.md](CHROMEWEBSTORE.md)

## 开发

```bash
pnpm dev        # 开发服务器 + 开发版扩展
pnpm build      # 生产构建
pnpm typecheck  # 类型检查
pnpm lint       # 代码检查
pnpm test       # 运行测试
```

## License

MIT
