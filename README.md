# FTL Link - FreeMarker 模板跳转

为 FreeMarker (.ftl) 模板文件提供路径导航和 CSS 类名跳转的 VS Code 扩展。解决模板文件中无法直接跳转到静态资源、被引用模板、以及 CSS 样式定义的问题。

## 功能特性

### 1. static 资源路径跳转

在 `href` 或 `src` 属性中的 `static/` 路径上使用 **Ctrl+Click**，直接跳转到项目根目录下对应的静态资源文件。

```html
<link rel="stylesheet" href="static/traditional/css/index.css">
<script src="static/common/js/jquery.min.js"></script>
<link href="/static/1100000088/ywtc/css/custom.css">
```

**跳转规则：** `static/` 前缀路径从项目根目录解析，而非模板文件所在目录。

---

### 2. #include 模板跳转

在 `<#include>` 指令中的文件路径上使用 **Ctrl+Click**，跳转到被引用的 `.ftl` 模板文件。

```html
<#include "common/basic.ftl" />
<#include "./component/header.ftl" />
<#include "../../default/common/footer.ftl" />
```

**跳转规则：** 路径相对于当前文件所在目录解析，支持 `./` 和 `../` 相对路径。

---

### 3. CSS 类名跳转

在 `class="xxx"` 中的类名上使用 **Ctrl+Click**，跳转到 CSS 中 `.xxx` 选择器的定义位置。

**查找顺序（按优先级）：**

1. **当前文件 `<style>` 块** — 在当前 `.ftl` 文件的内联 `<style>` 标签中查找
2. **当前文件 `<link>` CSS** — 在当前文件 `<link>` 引用的外部 CSS 文件中查找
3. **入口文件链式查找** — 通过 `<#include>` 引用链向上查找入口 `.ftl` 文件，在入口文件的 `<style>` 和 `<link>` CSS 中查找

**示例：**

```html
<!-- 文件: templates/pc/ai/default/common/header.ftl -->
<div class="search-input">
  <input type="text" class="header-input" placeholder="请输入搜索词">
</div>
```

Ctrl+Click `header-input` 会按以下顺序查找：
1. `header.ftl` 自身的 `<style>` 块
2. `header.ftl` 的 `<link>` 引用的 CSS 文件
3. 入口文件 `index.ftl`（它 `#include` 了 `header.ftl`）的 `<style>` 和 `<link>` CSS

---

### 4. CSS 类名预览

鼠标悬停在 `class="xxx"` 中的类名上，显示对应的 CSS 代码片段预览，无需跳转即可查看样式定义。

## 使用方式

安装扩展后，在任何 `.ftl` 文件中：
- **Ctrl+Click** (Windows/Linux) 或 **Cmd+Click** (Mac) 跳转到定义
- **Hover** 鼠标悬停查看 CSS 预览

## 配合使用

建议在项目 `.vscode/settings.json` 中添加以下配置，获得 HTML 语法高亮和自动补全：

```json
{
  "files.associations": {
    "*.ftl": "html"
  }
}
```
