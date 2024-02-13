import puppeteer from "puppeteer";
import * as fs from 'fs';
import process from 'process';

const exporToCSV = (data, filename) => {
  const csvContent = `Name,Rating,Location,Shop,Sold,Discount,Image\n${data.map(item => Object.values(item).join(',')).join('\n')}`;
  fs.writeFileSync(filename, csvContent);
};

async function getProducts(keyword, filename) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(`https://www.tokopedia.com/search?q=${keyword}`, {
    waitUntil: "domcontentloaded",
  });

  async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const result = [];

    const productElements = document.querySelectorAll('.prd_link-product-name.css-3um8ox');
    const productNames = Array.from(productElements).map(name =>
      name.innerText.trim()
    );    

    const ratingElements = document.querySelectorAll('div.prd_shop-rating-average-and-label > span.prd_rating-average-text');
    const productRatings = Array.from(ratingElements).map(rating => rating.innerText.trim());

    const locationElements = document.querySelectorAll('div.css-1rn0irl > span.prd_link-shop-loc');
    const productLocations = Array.from(locationElements).map(location => location.innerText.trim());

    const shopElements = document.querySelectorAll('span.prd_link-shop-name');
    const productShops = Array.from(shopElements).map(shop => shop.innerText.trim());

    const soldElements = document.querySelectorAll('span.prd_label-integrity');
    const productSolds = Array.from(soldElements).map(sold => sold.innerText.trim());

    const discountElements = document.querySelectorAll('.prd_badge-product-discount');
    const productDiscounts = Array.from(discountElements).map(discount => discount.innerText.trim());

    const images = Array.from(document.querySelectorAll('.pcv3_img_container > img'));
    const productImages = images.map(img => img.src)

    for (let i = 0; i < Math.min(productNames.length); i++) {
      const discount = productDiscounts[i] !== undefined ? productDiscounts[i] : 0;

      result.push({
        name: productNames[i],
        rating: productRatings[i],
        location: productLocations[i],
        shop: productShops[i],
        sold: productSolds[i],
        discount,
        image: productImages[i]
      });
    }

    return result;
  });

  exporToCSV(products, `${filename}.csv`)
  await browser.close();
};

const keyword = process.argv[2]
const filename = process.argv[3]
getProducts(keyword, filename);
