async function extractEurobikeData(page) {
    try {
        const data = await page.evaluate(() => {
            const name = document.querySelector('h1.ex-exhibitor-detail__title-headline')?.textContent?.trim() || '';

            const addressBlock = document.querySelector('.ex-contact-box__address-field-full-address');
            const addressText = addressBlock?.innerText?.trim() || '';
            const addressLines = addressText.split('\n');
            const addressLocality = addressLines[addressLines.length - 1] || '';

            const emailLink = document.querySelector('.ex-contact-box__contact-btn')?.getAttribute('href') || '';
            const email = emailLink.startsWith('mailto:') ? emailLink.split('mailto:')[1].split('?')[0] : '';

            const website = document.querySelector('.ex-contact-box__website-link')?.getAttribute('href') || '';

            const telephone = document.querySelector('.ex-contact-box__address-field-tel-number')?.textContent?.trim() || '';

            const productElements = document.querySelectorAll('.ex-exhibitor-detail-categories .ex-list-toggle__list-item span');
            const productsArray = Array.from(productElements).map(el => el.textContent.trim());
            const products = productsArray.join(', ');

            return { name, addressLocality, email, telephone, website, products };
        });

        // 数据验证
        if (!data.name) {
            throw new Error('无法提取公司名称');
        }

        // 数据清洗
        return {
            ...data,
            email: data.email.toLowerCase(),
            telephone: data.telephone.replace(/\s+/g, ' ').trim(),
            website: data.website.trim(),
            products: data.products || ''
        };

    } catch (error) {
        console.error('数据提取错误:', error);
        throw error;
    }
}

async function extractMessefrankfurtData(page) {
    try {
        const data = await page.evaluate(() => {
            const name = document.querySelector('h1.ex-exhibitor-detail__title-headline')?.textContent?.trim() || '';

            const addressBlock = document.querySelector('.ex-contact-box__address-field-full-address');
            const addressText = addressBlock?.innerText?.trim() || '';
            const addressLines = addressText.split('\n');
            const addressLocality = addressLines[addressLines.length - 1] || '';

            const emailLink = document.querySelector('.ex-contact-box__contact-btn')?.getAttribute('href') || '';
            const email = emailLink.startsWith('mailto:') ? emailLink.split('mailto:')[1].split('?')[0] : '';

            const website = document.querySelector('.ex-contact-box__website-link')?.getAttribute('href') || '';

            const telephone = document.querySelector('.ex-contact-box__address-field-tel-number')?.textContent?.trim() || '';

            const productElements = document.querySelectorAll('.ex-exhibitor-detail-categories .ex-list-toggle__list-item span');
            const productsArray = Array.from(productElements).map(el => el.textContent.trim());
            const products = productsArray.join(', ');
            return { name, addressLocality, email, telephone, website, products };
        });
        // 数据验证
        if (!data.name) {
            throw new Error('无法提取公司名称');
        }

        // 数据清洗
        return {
            ...data,
            email: data.email.toLowerCase(),
            telephone: data.telephone.replace(/\s+/g, ' ').trim(),
            website: data.website.trim(),
            products: data.products || ''
        };

    } catch (error) {
        console.error('数据提取错误:', error);
        throw error;
    }
}

//暂时用不到:此网站有反爬虫机制，经常会重定向到首页
async function extractAnugaData(page) {
    try {
        // 等待 ld+json script 加载
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 30000 });

        const data = await page.evaluate(() => {
            // 提取 JSON-LD 数据
            const scriptTag = document.querySelector('script[type="application/ld+json"]');
            const cleanedJsonText = scriptTag.textContent.replace(/\\(?!["\\/bfnrtu])/g, '');
            const jsonData = JSON.parse(cleanedJsonText);

            // 基础信息提取
            const name = (jsonData.name || '').trim();
            const email = (jsonData.email || '').replace('mailto:', '').trim();
            const telephone = (jsonData.telephone || '').trim();
            const addressLocality = (jsonData.address?.addressLocality || '').trim();
            const website = (jsonData.url || '').trim();

            // 提取产品列表
            let products = '';
            const accordeonList = document.querySelector('.accordeonlist ul.level-1');
            if (accordeonList) {
                try {
                    const productElements = accordeonList.querySelectorAll('li');
                    const productTexts = Array.from(productElements)
                        .map(el => el.textContent?.trim())
                        .filter(Boolean);
                    products = productTexts.join('; ');
                } catch (e) {
                    console.warn('无法解析产品列表');
                }
            }

            return { name, email, telephone, addressLocality, website, products };
        });

        // 数据验证
        if (!data.name) {
            throw new Error('无法提取公司名称');
        }

        // 检查是否为首页
        if (data.name === 'Experience the leading food fair in Cologne') {
            throw new Error('页面是展会首页');
        }

        // 数据清洗
        return {
            ...data,
            email: data.email.toLowerCase(),
            telephone: data.telephone.replace(/\s+/g, ' ').trim(),
            website: data.website.trim(),
            products: data.products || ''
        };

    } catch (error) {
        console.error('数据提取错误:', error);
        throw error;
    }
}

module.exports = {
    extractEurobikeData,
    extractMessefrankfurtData,
    extractAnugaData
};