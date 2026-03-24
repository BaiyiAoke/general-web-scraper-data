// 使用 puppeteer-extra 替换 puppeteer
const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const ExcelJS = require('exceljs');
const pLimit = require('p-limit').default; // 引入 p-limit

// 添加 stealth 插件，应对反爬虫
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 引入提取器
const { extractAnugaData,extractMessefrankfurtData,extractEurobikeData,extractThesmartere,extractEisenwarenData } = require('./extractors');

// --- 准备一些常见的 User-Agent ---
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
];

(async () => {
    // --- 浏览器启动配置 ---
    const browser = await puppeteer.launch({
        headless: 'new', // 使用新的 headless 模式
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=site-per-process'
        ],
        protocolTimeout: 60000
    });

    const routes = JSON.parse(fs.readFileSync('./input_json/route_eisenwaren.json', 'utf-8'));
    const results = [];
    const failedUrls = [];

    // 随机延迟函数
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const limit = pLimit(2); // 限制并发数量（Koelnmesse体系建议2）

    let urlCounter = 0;
    // 并发任务数组
    const tasks = routes.map((url, idx) => limit(async () => {
        urlCounter++;
        if(urlCounter >= 0) {
            // console.log(`\n[${urlCounter}/${routes.length}] Processing: ${url}`);
            let page;
            try {
                page = await browser.newPage(); // 每个任务单独创建 page
                await page.setViewport({ width: 1366, height: 768 });

                // --- 每次请求前设置一个随机的 User-Agent ---
                const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                await page.setUserAgent(randomUserAgent);
                // console.log(`  -> Using User-Agent: ${randomUserAgent}`);

                // --- 导航到页面 ---
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // 增加超时时间

                // --- 等待关键元素加载 (适用于eisenwaren/koelnmesse)---
                await page.waitForSelector('script[type="application/ld+json"]', { timeout: 30000 });
                
                // --- 模拟人类行为：随机滚动 ---
                // console.log('  -> Simulating human scroll...');
                await page.evaluate(async () => {
                    await new Promise(resolve => {
                        let totalHeight = 0;
                        const distance = 100 + Math.random() * 100; // 每次滚动100-200像素
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if(totalHeight >= scrollHeight){
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200 + Math.random() * 100); // 每200-300ms滚动一次
                    });
                });
                
                // --- 增加一个更长的随机延迟，模拟阅读 ---
                const randomDelay = 2000 + Math.random() * 3000; // 延迟2-5秒
                // console.log(`  -> Simulating reading time (${Math.round(randomDelay/1000)}s)...`);
                await sleep(randomDelay);

                // --- 提取数据 ---
                const data = await extractEisenwarenData(page);

                if (!data.name) {
                    // 如果没有提取到名称，可能页面结构有变或被拦截
                    throw new Error('Could not extract the name. The page might be blocked or changed.');
                }
                results.push({...data,sourceUrl : url});
                fs.writeFileSync('./output_json/excelData_eisenwaren.json', JSON.stringify(results, null, 2), 'utf-8'); // 每次采集后保存
                console.log(`✅ Extracted: ${data.name}`);

            } catch (err) {
                console.error(`❌ Failed to process ${url}:`, err.message);
                failedUrls.push(url); // 将失败的URL记录下来
                fs.writeFileSync('./output_json/failed_routes_eisenwaren.json', JSON.stringify(failedUrls, null, 2));
            } finally {
                if (page) await page.close(); // 关闭页面，释放资源
            }
        }
    }));

    await Promise.all(tasks); // 等待所有并发任务完成

    await browser.close();

    // --- 写入 Excel ---
    if (results.length > 0) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Organizations');

        // 设置列头和列宽
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Telephone', key: 'telephone', width: 20 },
            { header: 'Address', key: 'addressLocality', width: 40 },
            { header: 'Website', key: 'website', width: 50 },
            { header: 'Products', key: 'products', width: 60 },
            { header: 'SourceUrl', key: 'sourceUrl', width: 60 },
        ];

        // 添加数据行
        results.forEach(item => {
            worksheet.addRow(item);
        });

        // 写入文件
        workbook.xlsx.writeFile('./output_excel/eisenwaren_contact-info.xlsx')
            .then(() => {
                console.log(`\n📦 Successfully exported ${results.length} records to eisenwaren_contact-info.xlsx`);
            })
            .catch(err => {
                console.error('❌ Failed to write Excel file:', err);
            });
    } else {
        console.log("\n📦 No data was extracted.");
    }

    // --- 显示失败的URL ---
    if (failedUrls.length > 0) {
        console.log(`\n⚠️ The following ${failedUrls.length} URLs failed and could be retried:`);
        console.log(failedUrls);
        console.log('Failed URLs have been saved to failed_routes_eisenwaren.json');
    }
})();