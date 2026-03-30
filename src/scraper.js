const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const pLimit = require('p-limit').default;

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const config = require('../config');
const extractors = require('./extractors');
const { createLogger } = require('./logger');

// --- 解析命令行参数，选择站点 ---
const siteName = process.argv[2];
if (!siteName || !config.sites[siteName]) {
    const sites = Object.keys(config.sites).join(', ');
    console.error(`\n用法:`);
    console.error(`  node src/scraper.js <siteName>`);
    console.error(`  npm run scrape -- <siteName>`);
    console.error(`  yarn scrape <siteName>`);
    console.error(`\n可用站点: ${sites}\n`);
    process.exit(1);
}

const siteConfig = config.sites[siteName];
const extractFn = extractors[siteConfig.extractor];
if (!extractFn) {
    console.error(`未找到提取器: ${siteConfig.extractor}`);
    process.exit(1);
}

const log = createLogger(config.logLevel);

// --- 工具函数 ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function saveJson(filePath, data) {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 加载已采集数据（断点续爬）
function loadExistingResults(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (Array.isArray(data)) return data;
        } catch {
            // 文件损坏则忽略，从头开始
        }
    }
    return [];
}

(async () => {
    log.info(`启动爬取: ${siteName} (extractor: ${siteConfig.extractor}, concurrency: ${siteConfig.concurrency})`);

    const browser = await puppeteer.launch({
        headless: config.browser.headless,
        args: config.browser.args,
        protocolTimeout: config.browser.protocolTimeout,
    });

    // --- 断点续爬：加载已有数据，跳过已采集的 URL ---
    const results = loadExistingResults(siteConfig.outputJson);
    const collectedUrls = new Set(results.map(r => r.sourceUrl));

    const allRoutes = JSON.parse(fs.readFileSync(siteConfig.inputFile, 'utf-8'));
    const routes = allRoutes.filter(url => !collectedUrls.has(url));

    if (collectedUrls.size > 0) {
        log.info(`断点续爬: 已有 ${collectedUrls.size} 条记录, 剩余 ${routes.length} 条待采集`);
    }

    if (routes.length === 0) {
        log.info('所有 URL 已采集完毕，无需爬取');
        await browser.close();
        return;
    }

    let failedUrls = [];
    let newCount = 0; // 本轮新增计数（用于批量写入判断）

    // --- 单个 URL 处理函数 ---
    async function processUrl(url) {
        let page;
        try {
            page = await browser.newPage();
            await page.setViewport(config.browser.viewport);

            const randomUA = config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
            await page.setUserAgent(randomUA);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: config.browser.navigationTimeout });

            if (siteConfig.waitSelector) {
                await page.waitForSelector(siteConfig.waitSelector, { timeout: config.scraping.selectorTimeout });
            }

            // 模拟人类滚动
            const { scrollDistance, scrollInterval } = config.scraping;
            await page.evaluate(async (sd, si) => {
                await new Promise(resolve => {
                    let totalHeight = 0;
                    const distance = sd.min + Math.random() * (sd.max - sd.min);
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, si.min + Math.random() * (si.max - si.min));
                });
            }, scrollDistance, scrollInterval);

            // 模拟阅读延迟
            const { readDelay } = config.scraping;
            await sleep(readDelay.min + Math.random() * (readDelay.max - readDelay.min));

            // 提取数据
            const data = await extractFn(page);
            if (!data.name) {
                throw new Error('Could not extract the name. The page might be blocked or changed.');
            }

            results.push({ ...data, sourceUrl: url });
            newCount++;
            log.info(`✅ [${results.length}/${allRoutes.length}] ${data.name}`);

            // --- 每 N 条写入一次 ---
            if (newCount % config.scraping.batchWriteSize === 0) {
                saveJson(siteConfig.outputJson, results);
                log.debug(`批量写入: 已保存 ${results.length} 条记录`);
            }

            return true;
        } catch (err) {
            log.error(`❌ ${url}: ${err.message}`);
            return false;
        } finally {
            if (page) await page.close();
        }
    }

    const limit = pLimit(siteConfig.concurrency);

    // --- 首轮爬取 ---
    log.info(`开始爬取 ${routes.length} 个 URL...`);
    const tasks = routes.map(url => limit(async () => {
        const success = await processUrl(url);
        if (!success) failedUrls.push(url);
    }));
    await Promise.all(tasks);

    // 首轮结束后保存（确保尾部余量写入）
    saveJson(siteConfig.outputJson, results);

    // --- 失败重试（指数退避） ---
    const { maxRetries, retryBaseDelay } = config.scraping;
    for (let attempt = 1; attempt <= maxRetries && failedUrls.length > 0; attempt++) {
        const delay = retryBaseDelay * Math.pow(2, attempt - 1);
        log.warn(`重试第 ${attempt}/${maxRetries} 轮: ${failedUrls.length} 个失败 URL, 等待 ${delay / 1000}s...`);
        await sleep(delay);

        const retryUrls = [...failedUrls];
        failedUrls = [];

        const retryTasks = retryUrls.map(url => limit(async () => {
            const success = await processUrl(url);
            if (!success) failedUrls.push(url);
        }));
        await Promise.all(retryTasks);

        saveJson(siteConfig.outputJson, results);
    }

    await browser.close();

    // --- 保存最终失败的 URL ---
    if (failedUrls.length > 0) {
        saveJson(siteConfig.outputFailed, failedUrls);
        log.warn(`${failedUrls.length} 个 URL 最终失败，已保存到 ${siteConfig.outputFailed}`);
    }

    // --- 写入 Excel ---
    if (results.length > 0) {
        ensureDir(siteConfig.excelFile);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(siteConfig.worksheetName);
        worksheet.columns = config.excelColumns;
        results.forEach(item => worksheet.addRow(item));

        try {
            await workbook.xlsx.writeFile(siteConfig.excelFile);
            log.info(`📦 导出 ${results.length} 条记录到 ${siteConfig.excelFile}`);
        } catch (err) {
            log.error(`写入 Excel 失败: ${err.message}`);
        }
    } else {
        log.info('未提取到任何数据');
    }

    // --- 汇总 ---
    log.info(`完成: 成功 ${results.length}, 失败 ${failedUrls.length}, 总计 ${allRoutes.length}`);
})();
