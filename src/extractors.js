// Eurobike 和 MesseFrankfurt 共用同一套展商门户 DOM 结构
async function extractExhibitorPortalData(page) {
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

//此网站的并发数建议限制在2
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

async function extractThesmartere(page) {
    try {
        const data = await page.evaluate(() => {
            const name = document.querySelector('h1')?.textContent?.trim() || '';
            
            // 获取所有 teaser-information div
            const infoBlocks = document.querySelectorAll('.teaser-information');
            
            // 设置默认值
            let telephone = 'N/A', 
                email = 'N/A', 
                website = 'N/A', 
                addressLocality = 'N/A', 
                products = 'N/A';

            // 遍历所有 teaser-information 块
            infoBlocks.forEach(block => {
                // 检查是否是包含联系信息的块（通过查找dl元素）
                const contactList = block.querySelector('dl.content-detail-texticon-block');
                if (contactList) {
                    const dts = contactList.querySelectorAll('dt');
                    dts.forEach(dt => {
                        const text = dt.textContent.trim();
                        // 通过内容特征判断信息类型
                        if (text.match(/^\+?\d[\d\s-]+$/)) {
                            telephone = text;
                        } else if (text.includes('@')) {
                            email = text;
                        } else if (text.includes('http')) {
                            website = text;
                        } else if (text.includes(',')) {
                            // 提取地址中的城市/国家
                            const addressLines = text.split(',');
                            addressLocality = addressLines[addressLines.length - 1].trim();
                        }
                    });
                }
                
                // 检查是否是包含产品信息的块（通过查找ul元素）
                const productUl = block.querySelector('ul');
                if (productUl) {
                    const productItems = Array.from(productUl.querySelectorAll('li'))
                        .map(li => li.textContent.trim())
                        .filter(Boolean);
                    products = productItems.join(', ');
                }
            });

            return { name, telephone, email, website, addressLocality, products };
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
            addressLocality: data.addressLocality.trim(),
            products: data.products || ''
        };

    } catch (error) {
        console.error('数据提取错误:', error);
        throw error;
    }
}

//此网站的并发数建议限制在2（Koelnmesse体系）
async function extractEisenwarenData(page) {
    try {
        // 等待 ld+json script 加载
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 30000 });

        const data = await page.evaluate(() => {
            // 提取 JSON-LD 数据
            const scriptTag = document.querySelector('script[type="application/ld+json"]');
            const cleanedJsonText = scriptTag.textContent.replace(/\\(?!["\\\//bfnrtu])/g, '');
            const jsonData = JSON.parse(cleanedJsonText);

            // 基础信息提取
            const name = (jsonData.name || '').trim();
            const email = (jsonData.email || '').replace('mailto:', '').trim();
            const telephone = (jsonData.telephone || '').trim();
            const website = (jsonData.url || '').trim();

            // 拼接完整地址: streetAddress, postalCode, addressLocality
            const street = (jsonData.address?.streetAddress || '').trim();
            const postalCode = (jsonData.address?.postalCode || '').trim();
            const locality = (jsonData.address?.addressLocality || '').trim();
            const addressParts = [street, postalCode, locality].filter(Boolean);
            const addressLocality = addressParts.join(', ');

            // 提取产品列表（ul.level-1 > li > .acctitel 为顶级分类名称）
            let products = '';
            const productList = document.querySelector('.accordeonlist ul.level-1');
            if (productList) {
                const topCategories = productList.querySelectorAll(':scope > li > .acctitel');
                const productTexts = Array.from(topCategories)
                    .map(el => el.textContent?.trim())
                    .filter(Boolean);
                products = productTexts.join('; ');
            }

            return { name, email, telephone, addressLocality, website, products };
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

// Eurobike 使用 JSON-LD（ProfilePage > author）提取数据，产品仍走 DOM
async function extractEurobikeData(page) {
    try {
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 30000 });

        const data = await page.evaluate(() => {
            const scriptTag = document.querySelector('script[type="application/ld+json"]');
            const jsonData = JSON.parse(scriptTag.textContent);
            const author = jsonData.author || {};
            const address = author.address || {};

            const name = (author.name || '').trim();
            const email = (author.email || '').replace('mailto:', '').trim();
            const telephone = (author.telephone || '').trim();
            const website = (author.url || '').trim();

            const street = (address.streetAddress || '').trim();
            const postalCode = (address.postalCode || '').trim();
            const locality = (address.addressLocality || '').trim();

            // 国家从 DOM 最后一行获取（JSON-LD 只有国家代码）
            const addressBlock = document.querySelector('.ex-contact-box__address-field-full-address');
            const addressLines = (addressBlock?.innerHTML || '')
                .split(/<br\s*\/?>/i)
                .map(s => s.replace(/<[^>]+>/g, '').trim())
                .filter(Boolean);
            const country = addressLines[addressLines.length - 1] || '';

            const addressParts = [street, postalCode, locality].filter(Boolean);
            const addressLocality = addressParts.join(', ');

            // 产品分类仍从 DOM 获取
            const productElements = document.querySelectorAll('.ex-exhibitor-detail-categories .ex-list-toggle__list-item span');
            const products = Array.from(productElements).map(el => el.textContent.trim()).join(', ');

            return { name, email, telephone, website, addressLocality, country, products };
        });

        if (!data.name) {
            throw new Error('无法提取公司名称');
        }

        return {
            ...data,
            email: data.email.toLowerCase(),
            telephone: data.telephone.replace(/\s+/g, ' ').trim(),
            website: data.website.trim(),
            country: data.country || '',
            products: data.products || ''
        };

    } catch (error) {
        console.error('数据提取错误:', error);
        throw error;
    }
}

module.exports = {
    extractExhibitorPortalData,
    extractEurobikeData,
    extractMessefrankfurtData: extractExhibitorPortalData,
    extractAnugaData,
    extractThesmartere,
    extractEisenwarenData,
};