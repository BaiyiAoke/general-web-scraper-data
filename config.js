// ============================
// 通用爬虫配置文件
// 用法: node src/scraper.js <siteName>
// 例如: node src/scraper.js eisenwaren
// ============================

module.exports = {
    // --- 日志级别: DEBUG | INFO | WARN | ERROR ---
    logLevel: 'INFO',

    // --- 站点配置 ---
    sites: {
        eisenwaren: {
            inputFile: './data/routes/route_eisenwaren.json',
            extractor: 'extractEisenwarenData',
            outputJson: './data/output/json/excelData_eisenwaren.json',
            outputFailed: './data/output/json/failed_routes_eisenwaren.json',
            excelFile: './data/output/excel/eisenwaren_contact-info.xlsx',
            concurrency: 2, // Koelnmesse体系建议2
            waitSelector: 'script[type="application/ld+json"]',
            worksheetName: 'Organizations',
            // 路由采集配置（用于 route-scraper.js）
            routeScraper: {
                startUrl: 'https://www.eisenwarenmesse.com/eisenwarenmesse-exhibitors/list-of-exhibitors/',
                baseUrl: 'https://www.eisenwarenmesse.com',
                listItemSelector: '.item .inner',                    // 列表项容器
                linkSelector: '.col1ergebnis a.db-aslink',           // 展商详情链接
                nextPageSelector: '.notmobile .pagination-footer a.slick-next', // 下一页按钮
                pageDelay: 3000,   // 翻页等待时间(ms)
                maxPages: 200,     // 最大页数（安全保护）
            },
        },
        test: {
            inputFile: './data/routes/route_test.json',
            extractor: 'extractMessefrankfurtData',
            outputJson: './data/output/json/excelData_test.json',
            outputFailed: './data/output/json/failed_routes_test.json',
            excelFile: './data/output/excel/test_contact-info.xlsx',
            concurrency: 2,
            waitSelector: 'h1.ex-exhibitor-detail__title-headline',
            worksheetName: 'Organizations',
        },
        anuga: {
            inputFile: './data/routes/route_anuga.json',
            extractor: 'extractAnugaData',
            outputJson: './data/output/json/excelData_anuga.json',
            outputFailed: './data/output/json/failed_routes_anuga.json',
            excelFile: './data/output/excel/anuga_contact-info.xlsx',
            concurrency: 2, // Koelnmesse体系建议2
            waitSelector: 'script[type="application/ld+json"]',
            worksheetName: 'Organizations',
        },
        eurobike: {
            inputFile: './data/routes/route_eurobike.json',
            extractor: 'extractEurobikeData',
            outputJson: './data/output/json/excelData_eurobike.json',
            outputFailed: './data/output/json/failed_routes_eurobike.json',
            excelFile: './data/output/excel/eurobike_contact-info.xlsx',
            concurrency: 3,
            waitSelector: 'script[type="application/ld+json"]',
            worksheetName: 'Organizations',
            // 路由采集配置（用于 route-scraper.js）
            routeScraper: {
                startUrl: 'https://eurobike.com/frankfurt/en/exhibitor-search.html?page=1&pagesize=90',
                baseUrl: 'https://eurobike.com',
                listItemSelector: 'a[href*="exhibitor-search.detail.html"]', // 等待列表链接出现
                linkSelector: 'a[href*="exhibitor-search.detail.html"]',     // 展商详情链接
                nextPageSelector: '.a-slide-nav--right',               // ⚠️ 需用 DevTools 验证此选择器
                pageDelay: 3000,  // 翻页等待时间(ms)
                maxPages: 20,     // 最大页数（当前约 9 页，留余量）
            },
        },
        thesmartere: {
            inputFile: './data/routes/route_thesmartere.json',
            extractor: 'extractThesmartere',
            outputJson: './data/output/json/excelData_thesmartere.json',
            outputFailed: './data/output/json/failed_routes_thesmartere.json',
            excelFile: './data/output/excel/thesmartere_contact-info.xlsx',
            concurrency: 3,
            waitSelector: 'h1',
            worksheetName: 'Organizations',
        },
    },

    // --- 浏览器配置 ---
    browser: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=site-per-process',
        ],
        protocolTimeout: 60000,
        navigationTimeout: 60000,
        viewport: { width: 1366, height: 768 },
    },

    // --- 爬取行为配置 ---
    scraping: {
        selectorTimeout: 30000,
        scrollDistance: { min: 100, max: 200 },
        scrollInterval: { min: 200, max: 300 },
        readDelay: { min: 2000, max: 5000 },
        batchWriteSize: 5,      // 每采集 N 条写入一次 JSON
        maxRetries: 2,           // 失败 URL 最大重试轮数
        retryBaseDelay: 5000,    // 重试基础延迟(ms)，指数退避: 5s, 10s
    },

    // --- User-Agent 池 ---
    userAgents: [
        // Chrome (Windows)
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Chrome (macOS)
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Firefox (Windows)
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        // Edge (Windows)
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
        // Safari (macOS)
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    ],

    // --- Excel 列定义（所有 extractor 返回结构一致，共用） ---
    excelColumns: [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Telephone', key: 'telephone', width: 20 },
        { header: 'Address', key: 'addressLocality', width: 40 },
        { header: 'Country', key: 'country', width: 20 },
        { header: 'Website', key: 'website', width: 50 },
        { header: 'Products', key: 'products', width: 60 },
        { header: 'SourceUrl', key: 'sourceUrl', width: 60 },
    ],
};
