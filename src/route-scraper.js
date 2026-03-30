const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const path = require('path');

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const config = require('../config');
const { createLogger } = require('./logger');

// --- 解析命令行参数 ---
const siteName = process.argv[2];
if (!siteName || !config.sites[siteName]) {
    const sites = Object.keys(config.sites).join(', ');
    console.error(`\n用法:`);
    console.error(`  node src/route-scraper.js <siteName>`);
    console.error(`  npm run routes -- <siteName>`);
    console.error(`  yarn routes <siteName>`);
    console.error(`\n可用站点: ${sites}\n`);
    process.exit(1);
}

const siteConfig = config.sites[siteName];
if (!siteConfig.routeScraper) {
    console.error(`\n站点 "${siteName}" 未配置路由采集 (routeScraper)。`);
    console.error(`请在 config.js 的 sites.${siteName} 中添加 routeScraper 配置。\n`);
    process.exit(1);
}

const log = createLogger(config.logLevel);
const routeConfig = siteConfig.routeScraper;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

(async () => {
    log.info(`启动路由采集: ${siteName}`);
    log.info(`起始页: ${routeConfig.startUrl}`);

    const browser = await puppeteer.launch({
        headless: config.browser.headless,
        args: config.browser.args,
        protocolTimeout: config.browser.protocolTimeout,
    });

    const page = await browser.newPage();
    await page.setViewport(config.browser.viewport);

    const randomUA = config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
    await page.setUserAgent(randomUA);

    const allUrls = [];
    const uniqueUrls = new Set();
    let pageNum = 1;

    const outputFile = siteConfig.inputFile;
    ensureDir(outputFile);

    try {
        // 导航到起始页
        await page.goto(routeConfig.startUrl, {
            waitUntil: 'networkidle2',
            timeout: config.browser.navigationTimeout,
        });

        // 等待列表容器加载
        await page.waitForSelector(routeConfig.listItemSelector, {
            timeout: config.scraping.selectorTimeout,
        });

        while (true) {
            // 提取当前页的展商链接
            const urls = await page.evaluate((linkSelector, baseUrl) => {
                const links = document.querySelectorAll(linkSelector);
                return Array.from(links).map(a => {
                    const href = a.getAttribute('href');
                    if (!href) return null;
                    // 处理相对路径
                    if (href.startsWith('http')) return href;
                    return new URL(href, baseUrl).href;
                }).filter(Boolean);
            }, routeConfig.linkSelector, routeConfig.baseUrl);

            const newUrls = urls.filter(u => !uniqueUrls.has(u));
            newUrls.forEach(u => uniqueUrls.add(u));
            allUrls.push(...newUrls);
            log.info(`第 ${pageNum} 页: 采集到 ${urls.length} 个链接 (新增 ${newUrls.length}, 累计 ${allUrls.length})`);

            // 每页采集后立即写入
            fs.writeFileSync(outputFile, JSON.stringify(allUrls, null, 2), 'utf-8');
            // 检查是否有下一页
            const hasNext = await page.evaluate((nextSelector) => {
                const nextBtn = document.querySelector(nextSelector);
                return !!nextBtn;
            }, routeConfig.nextPageSelector);

            if (!hasNext) {
                log.info('已到达最后一页');
                break;
            }

            // 限制最大页数（安全保护）
            if (routeConfig.maxPages && pageNum >= routeConfig.maxPages) {
                log.warn(`已达到最大页数限制: ${routeConfig.maxPages}`);
                break;
            }

            // 点击下一页
            await page.evaluate((nextSelector) => {
                const nextBtn = document.querySelector(nextSelector);
                if (nextBtn) nextBtn.click();
            }, routeConfig.nextPageSelector);

            // 等待页面更新
            await sleep(routeConfig.pageDelay || 2000);
            await page.waitForSelector(routeConfig.listItemSelector, {
                timeout: config.scraping.selectorTimeout,
            });

            pageNum++;
        }
    } catch (err) {
        log.error(`采集中断: ${err.message}`);
    }

    await browser.close();

    // 最终汇总
    log.info(`共采集 ${allUrls.length} 个唯一 URL，已保存到 ${outputFile}`);
})();
