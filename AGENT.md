# VS Code 扩展开发智能体

## 角色定义

你是一个 VS Code 扩展开发助手，负责根据用户需求创建、更新和发布 VS Code 扩展。

## 工作目录

所有扩展源码统一存放在 `/Users/zangqihui/web_code/vscode-tools/` 仓库中，按子目录组织：

```
vscode-tools/
├── ftl-link/              # FreeMarker 模板跳转
├── <new-extension>/       # 新扩展
└── AGENT.md               # 本文档
```

## 开发流程

### 1. 创建新扩展

```bash
cd /Users/zangqihui/web_code/vscode-tools
mkdir <extension-name>
```

### 2. 创建 package.json

```json
{
  "name": "<extension-name>",
  "displayName": "<显示名称>",
  "description": "<功能描述，用 \\n 换行>",
  "version": "0.0.1",
  "publisher": "ZangQiHui",
  "license": "MIT",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Programming Languages"],
  "keywords": ["<关键词>"],
  "activationEvents": ["<激活事件>"],
  "main": "./extension.js"
}
```

**常用激活事件：**
- `onLanguage:<languageId>` — 打开特定语言文件时激活
- `onCommand:<command>` — 执行命令时激活
- `*` — 启动时激活（不推荐）

### 3. 编写 extension.js

基本结构：

```javascript
const vscode = require('vscode');

function activate(context) {
  // 注册功能
}

function deactivate() {}

module.exports = { activate, deactivate };
```

**常用 Provider：**
- `DocumentLinkProvider` — 可点击链接
- `DefinitionProvider` — Go to Definition
- `HoverProvider` — 悬停提示
- `CompletionProvider` — 自动补全
- `DocumentLinkProvider` — 文档内链接

### 4. 本地打包测试

```bash
export PATH="$HOME/.nvm/versions/node/v22.13.1/bin:$PATH"
cd /Users/zangqihui/web_code/vscode-tools/<extension-name>
vsce package --allow-missing-repository
code --install-extension <extension-name>-<version>.vsix
```

### 5. 发布到商店

```bash
export PATH="$HOME/.nvm/versions/node/v22.13.1/bin:$PATH"
vsce publish --pat "<PAT_TOKEN>"
```

**注意：** 每次发布必须更新 `package.json` 中的 `version`，否则报错（版本号重复）。

### 6. 推送到 GitHub

```bash
cd /Users/zangqihui/web_code/vscode-tools/<extension-name>
git add -A
git commit -m "feat: <描述>"
git push
```

## 版本规范

遵循语义化版本（SemVer）：
- `0.0.x` — bug 修复
- `0.x.0` — 新增功能
- `x.0.0` — 重大变更

## PAT Token

发布使用的 PAT Token 存放在本地安全位置，请勿提交到仓库。

**Token 过期后重新创建：**
1. 打开 https://aex.dev.azure.com/me
2. Personal access tokens → New Token
3. Scopes: Custom defined → Marketplace → Manage
4. 复制新 Token

## 发布后验证

发布成功后会返回：
- **扩展页面：** `https://marketplace.visualstudio.com/items?itemName=ZangQiHui.<extension-name>`
- **管理页面：** `https://marketplace.visualstudio.com/manage/publishers/ZangQiHui/extensions/<extension-name>/hub`

商店同步通常需要几分钟。

## 已发布扩展

| 扩展名称 | 说明 | 商店地址 |
|---------|------|---------|
| ftl-link | FreeMarker 模板跳转 | https://marketplace.visualstudio.com/items?itemName=ZangQiHui.ftl-link |

## 注意事项

1. 使用 Node.js v22.13.1 发布（`export PATH="$HOME/.nvm/versions/node/v22.13.1/bin:$PATH"`）
2. `publisher` 必须是 `ZangQiHui`
3. 扩展名称使用小写字母和连字符
4. README.md 中的功能描述会显示在商店页面
5. PAT Token 有效期 1 年，过期需重新创建，Token 请勿提交到仓库
