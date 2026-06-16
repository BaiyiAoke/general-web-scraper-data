# 通用展会爬虫

基于 Puppeteer + Stealth 的展会展商信息采集工具，支持多站点配置，输出 JSON + Excel。

## 目录结构

```
├── config.js              # 所有站点配置（唯一需要修改的文件）
├── src/
│   ├── scraper.js         # 主爬虫：读取路由文件，采集展商详情
│   ├── route-scraper.js   # 路由采集：从列表页抓取所有展商 URL
│   ├── extractors.js      # 各站点数据提取函数
│   └── logger.js          # 日志工具
└── data/
    ├── routes/            # 存放 URL 列表（route_*.json）
    └── output/
        ├── json/          # 采集结果 JSON
        └── excel/         # 最终 Excel 文件
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 标准两步流程

**第一步：采集展商 URL 列表**（需要站点配置了 `routeScraper`）

```bash
node src/route-scraper.js <siteName>
# 或
npm run routes -- <siteName>
```

**第二步：采集展商详情数据**

```bash
node src/scraper.js <siteName>
# 或
npm run scrape -- <siteName>
```

## 已配置站点

| siteName | 网站 | 提取器 | routeScraper |
|---|---|---|:---:|
| `eisenwaren` | eisenwarenmesse.com | `extractEisenwarenData` | ✅ |
| `anuga` | koelnmesse.com (Anuga) | `extractAnugaData` | ❌ |
| `eurobike` | eurobike.com | `extractEurobikeData` | ✅ |
| `thesmartere` | thesmartere.de | `extractThesmartere` | ❌ |
| `test` | messefrankfurt.com | `extractMessefrankfurtData` | ❌ |

> 没有 `routeScraper` 的站点，需要手动准备 `data/routes/route_<siteName>.json`（URL 数组格式）。

## 新增站点流程

### 1. 在 `config.js` 的 `sites` 中添加配置

```js
mysite: {
    inputFile: './data/routes/route_mysite.json',   // URL 列表文件路径
    extractor: 'extractMysiteData',                  // 对应 extractors.js 中的函数名
    outputJson: './data/output/json/excelData_mysite.json',
    outputFailed: './data/output/json/failed_routes_mysite.json',
    excelFile: './data/output/excel/mysite_contact-info.xlsx',
    concurrency: 2,                                  // 并发数（反爬严格的站点建议 2）
    waitSelector: 'h1.some-selector',                // 详情页加载完成的标志元素
    worksheetName: 'Organizations',
    routeScraper: {                                   // 可选，用于自动采集 URL 列表
        startUrl: 'https://example.com/exhibitors',
        baseUrl: 'https://example.com',
        listItemSelector: '.list-item',              // 列表项容器（用于等待页面加载）
        linkSelector: '.list-item a',                // 详情链接 <a> 元素
        nextPageSelector: '.pagination .next',       // 下一页按钮（⚠️ 用 DevTools 验证）
        pageDelay: 3000,
        maxPages: 100,
    },
},
```

### 2. 在 `extractors.js` 中添加提取函数

```js
async function extractMysiteData(page) {
    const data = await page.evaluate(() => {
        return {
            name: document.querySelector('h1')?.textContent?.trim() || '',
            email: '',
            telephone: '',
            addressLocality: '',
            website: '',
            products: '',
        };
    });
    if (!data.name) throw new Error('无法提取公司名称');
    return data;
}
```

在文件末尾的 `module.exports` 中注册：

```js
module.exports = {
    // ...已有函数...
    extractMysiteData,
};
```

### 3. 验证翻页选择器

打开目标站点列表页，按 F12 → Console，输入：

```js
// 查找"下一页"按钮
document.querySelectorAll('a, button')
  .forEach(el => {
    if (el.innerText.includes('›') || el.getAttribute('aria-label')?.toLowerCase().includes('next'))
      console.log(el.className, el)
  })
```

将找到的选择器填入 `nextPageSelector`。

## 断点续爬

`scraper.js` 会自动读取已有的 `outputJson` 文件，跳过已采集的 URL，直接运行命令即可续爬。

## 提取器对应关系

| 提取器函数 | 适用体系 | 数据来源 |
|---|---|---|
| `extractExhibitorPortalData` | fairnamic / MesseFrankfurt / Eurobike | DOM 选择器 |
| `extractEurobikeData` | Eurobike（同上，别名） | DOM 选择器 |
| `extractMessefrankfurtData` | MesseFrankfurt（同上，别名） | DOM 选择器 |
| `extractAnugaData` | Koelnmesse 体系 | `<script type="application/ld+json">` |
| `extractEisenwarenData` | Koelnmesse 体系 | `<script type="application/ld+json">` |
| `extractThesmartere` | thesmartere.de | DOM 选择器 |

## 关键配置项说明

| 配置项 | 位置 | 说明 |
|---|---|---|
| `logLevel` | 全局 | `DEBUG` / `INFO` / `WARN` / `ERROR` |
| `concurrency` | 站点级 | 并发采集数，Koelnmesse 体系建议 `2` |
| `waitSelector` | 站点级 | 详情页渲染完成的标志元素，防止数据为空 |
| `batchWriteSize` | 全局 | 每采集 N 条写一次 JSON，防止数据丢失 |
| `maxRetries` | 全局 | 失败 URL 最大重试轮数 |
| `pageDelay` | routeScraper | 翻页后等待时间（ms），过短可能漏抓 |
| `maxPages` | routeScraper | 最大翻页数，防止死循环 |

## 输出格式

每条记录的 JSON 结构：

```json
{
  "name": "公司名称",
  "addressLocality": "城市, 国家",
  "telephone": "+49 123 456789",
  "email": "contact@example.com",
  "website": "https://www.example.com",
  "products": "产品类别1, 产品类别2",
  "sourceUrl": "https://example.com/exhibitor/detail.html"
}
```
