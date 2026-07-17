# 代码编写规范

基于 `static/common/` 和 `templates/pc/ai/` 目录的代码风格分析，制定以下规范。

---

## 一、JavaScript 规范 (static/common/js/)

### 1.1 变量命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量 | camelCase | `siteCode`, `appCode`, `tabCode`, `lastParams` |
| 常量 | camelCase (const) | `const siteStore = {}`, `const api = {}` |
| jQuery 对象 | `$` 前缀 | `$(this)`, `$(".header_nav")`, `$aiddList` |
| 私有变量 | `_` 前缀 | `_item`, `_aiddModal`, `_hideDom` |
| 全局标志 | camelCase + Flag | `warningFlag`, `autoScrollEnabled` |

### 1.2 函数命名

| 类型 | 前缀/规范 | 示例 |
|------|----------|------|
| 获取数据 | `get` | `getSiteFun`, `getSearchFun`, `getAreaFun` |
| 设置属性 | `set` | `setWindowTitle`, `setWindowMeta` |
| 获取参数 | `fetch` | `fetchURIParams`, `fetchUserId` |
| API 调用 | `api_` | `api_display`, `api_search`, `api_area` |
| 事件绑定 | `event_` | `event_nav`, `event_click_search_word` |
| 组件生成 | `component_` | `component_nav`, `component_hot_word_input` |
| 数据处理 | `generate` | `generateNavByStore`, `generateHotwordByStore` |
| 回调函数 | `success_` / `handle_` | `displaySuccessHandle`, `handle_feedback_success` |

### 1.3 代码结构

```javascript
// 1. IIFE 封装 (polyfill)
(function () {
  // polyfill 代码
})();

// 2. 全局变量声明
let queueIndex = 0;
const xDebug = new URLSearchParams(window.location.search).get("XKKZTM");

// 3. Store 定义
const siteStore = {
  appType: "",
  currentTabCode: "",
  appInfo: {},
  appConfig: {},
};

// 4. 工具函数
function setWindowTitle(title) {
  document.title = title;
}

// 5. API 函数
function api_display(params, successHandle, errorHandle) {
  // API 调用
}

// 6. 事件函数
function event_nav() {
  $(".header_nav .header_nav_item").click(function () {
    // 事件处理
  });
}

// 7. 组件函数
function component_nav(tabMap, currentTabCode) {
  let htmlStr = "";
  htmlStr += `<div class="header_nav_item">${tab.chsName}</div>`;
  $(".header_nav .header_nav_middle").html(htmlStr);
  event_nav();
}

// 8. 回调函数
function displaySuccessHandle(params, response) {
  // 处理响应
}

// 9. 入口函数
$(function () {
  // 初始化
});
```

### 1.4 字符串引号

- **单引号** 优先用于 JavaScript 字符串
- **双引号** 用于 HTML 属性
- **模板字符串** 用于包含变量的字符串

```javascript
// 单引号
const tabCode = 'default';

// 模板字符串
htmlStr += `<div class="${isOn}">${tab.chsName}</div>`;
```

### 1.5 分号使用

新代码建议统一：函数声明不加分号，变量声明加分号。

```javascript
function setWindowTitle(title) {
  document.title = title;
}

const siteStore = {};
let queueIndex = 0;
```

### 1.6 注释风格

```javascript
/**
 * 函数描述
 * @param {类型} 参数名 - 参数说明
 * @returns {类型} 返回值说明
 */
function example(param) {
  // 单行注释：解释代码逻辑
  const result = param;
  return result;
}
```

### 1.7 jQuery 使用模式

```javascript
// 选择器
$(".header_nav .header_nav_item")
$("#main_ipt")
$(this)

// 事件绑定
$(selector).click(function () { });
$(selector).bind("click", function () { });

// DOM 操作
$(selector).html(htmlStr);
$(selector).append(htmlStr);
$(selector).show();
$(selector).hide();
$(selector).addClass("on");
$(selector).removeClass("on");

// 数据获取
const data = $(selector).data();
const value = $(selector).val();
```

### 1.8 模板字符串生成

```javascript
function component_nav(tabMap, currentTabCode) {
  const tabList = Object.values(tabMap || {}).filter(item => item.labelPcDisplayStatus);

  const htmlStr = tabList.map(tab => {
    const isOn = tab.tabCode === currentTabCode ? " on" : "";
    return `<div data-tab-code="${tab.tabCode}" class="header_nav_item${isOn}">
              <a href="${tab.postUrl}">${tab.chsName}</a>
            </div>`;
  }).join("");

  $(".header_nav .header_nav_middle").html(htmlStr);
  event_nav();
}
```

---

## 二、CSS 规范 (static/common/css/)

### 2.1 类名命名

使用 **下划线命名法** (snake_case)，避免使用中划线和驼峰。

```css
/* 正确 */
.header_nav_item { }
.hot_word_list_item { }
.loading_spinner_box { }

/* 错误 */
.header-nav-item { }
.hotWordListItem { }
```

### 2.2 CSS 变量

使用 `--` 前缀定义全局变量，在 `:root` 中声明：

```css
:root {
  --font-size: 16px;
  --font-size-small: 14px;
  --theme-color: #bd1a2d;
  --font-color: #333;
  --font-color-gray: #999;
}
```

### 2.3 属性书写顺序

```css
.selector {
  /* 1. 定位 */
  position: relative;
  /* 2. 盒模型 */
  display: flex;
  width: 100%;
  height: 60px;
  padding: 10px;
  /* 3. 排版 */
  font-size: var(--font-size);
  color: var(--font-color);
  /* 4. 视觉 */
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  /* 5. 其他 */
  cursor: pointer;
  transition: all 0.2s ease;
}
```

### 2.4 注释风格

```css
/* 头部导航 */
.header_nav {
  width: 100%;
  background: var(--theme-color);
}
```

---

## 三、FreeMarker 模板规范 (templates/)

### 3.1 文件结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <!-- 1. CSS 引用 -->
    <link rel="stylesheet" href="static/common/css/normal.css">
    <link rel="stylesheet" href="static/common/css/all.css">
    <!-- 2. SEO 配置 -->
    <#if runtimeContext.seoMap??>
      <#list runtimeContext.seoMap?keys as key>
        <meta name="${key}" content="${runtimeContext.seoMap[key]}">
      </#list>
    </#if>
    <!-- 3. JS 引用 -->
    <script type="text/javascript" src="static/common/js/jquery.min.js"></script>
    <script type="text/javascript" src="static/common/js/utils.js"></script>
  </head>
  <body>
    <#include "common/header.ftl" />
    <div class="middle" id="middle_box">
      <#include "common/answer.ftl" />
    </div>
    <#include "common/footer.ftl" />
  </body>
</html>
```

### 3.2 缩进与格式

- 使用 **2 个空格** 缩进
- 自闭合标签使用 `/>` 结尾

```html
<div class="header">
  <div class="logo">
    <a href="javascript:;">
      <img src="" alt="">
    </a>
  </div>
</div>
```

### 3.3 FreeMarker 指令

```html
<!-- 条件判断 -->
<#if condition??>
  ${value!''}
</#if>

<!-- 循环 -->
<#list items?keys as key>
  <div>${items[key]}</div>
</#list>

<!-- 模板引入 -->
<#include "common/header.ftl" />
<#include "./component/header.ftl" />
<#include "../../default/common/footer.ftl" />
```

### 3.4 变量引用

```html
${siteCode!}
${siteCode!''}
${tabCode!''}
${runtimeContext.seoMap[key]!''}
```

---

## 四、通用规范

### 4.1 文件命名

- JavaScript: camelCase (`utils.js`, `api.js`, `store.js`)
- CSS: camelCase (`all.css`, `normal.css`)
- FTL: camelCase (`header.ftl`, `answer.ftl`, `component.ftl`)

### 4.2 引用顺序

```html
<!-- CSS 引用顺序 -->
<link rel="stylesheet" href="static/common/css/normal.css">
<link rel="stylesheet" href="static/common/css/all.css">
<link rel="stylesheet" href="static/{siteCode}/{appCode}/css/custom.css">

<!-- JS 引用顺序 -->
<!-- 1. 第三方库 -->
<script src="static/common/js/jquery.min.js"></script>
<!-- 2. 工具库 -->
<script src="static/common/js/utils.js"></script>
<!-- 3. 数据层 -->
<script src="static/common/js/store.js"></script>
<!-- 4. 业务逻辑 -->
<script src="static/common/js/handle.js"></script>
<script src="static/common/js/component.js"></script>
<script src="static/common/js/event.js"></script>
<!-- 5. 入口 -->
<script src="static/common/js/entrance.js"></script>
<!-- 6. 自定义 -->
<script src="static/{siteCode}/{appCode}/js/custom.js"></script>
```

---

## 五、待优化项

1. **分号使用不一致** — 建议统一添加或不添加
2. **字符串引号混用** — 建议 JS 统一用单引号，HTML 属性用双引号
3. **var/let/const 混用** — 建议优先使用 `const`，需要重赋值时用 `let`，避免 `var`
4. **jQuery 事件绑定方式** — 建议统一使用 `.on("click", handler)` 或 `.click(handler)`
