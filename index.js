const puppeteer = require("puppeteer");
const fs = require("fs");


// Load cookies
const raw = fs.readFileSync("./cookies.json", "utf8");
const cookies = JSON.parse(raw);

// =====================
// AutoLike Function
// =====================
async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike, target ${maxLikes} like`);

  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < maxLikes; i++) {

    const result = await page.evaluate(() => {

      const articles = document.querySelectorAll("article");

      for (const article of articles) {

        const svgLike = article.querySelector('svg[aria-label="Like"]');

        if (svgLike) {
          const button = svgLike.closest("button");
          if (button) {
            button.scrollIntoView({ block: "center" });
            button.click();
            return true;
          }
        }
      }

      return false;
    });

    if (!result) {
      console.log(`❌ Like ke-${i + 1} gagal, scroll cari postingan baru...`);
      await page.evaluate(() => window.scrollBy(0, 900));
      await delay(2500);
      continue;
    }

    console.log(`❤️ Like ke-${i + 1} berhasil`);

    await delay(interval + Math.random() * 1500); // random delay biar natural

    await page.evaluate(() => window.scrollBy(0, 700));
    await delay(2000);
  }

  console.log("✅ AutoLike selesai");
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  //MODE MOBILE
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 360, height: 687 });
  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("Current URL:", page.url());
  await page.waitForTimeout(4000);

  // DEBUG SVG
const count = await page.evaluate(() => {
  return document.querySelectorAll("svg").length;
});
console.log("Total SVG di halaman:", count);

const likeCount = await page.evaluate(() => {
  return document.querySelectorAll('svg[aria-label="Like"]').length;
});
console.log("Total Like button:", likeCount);
  const debug = await page.evaluate(() => {
  return Array.from(
    document.querySelectorAll('svg[aria-label="Suka"]')
  ).length;
});
console.log("Total tombol suka:", debug);


const isLogin = await page.evaluate(() => {
  return document.body.innerText.includes("Log in") === false;
});

console.log("Status login:", isLogin ? "LOGIN" : "BELUM LOGIN");
  
      const debugLike = await page.evaluate(() => {
  const articles = document.querySelectorAll("article");
  return articles.length;
});

console.log("Total article:", debugLike);

  await autoLike(page, 10, 3000);

  await browser.close();
})();
