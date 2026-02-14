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
    
    // === Cara 1: evaluate click ===
  const result = await page.evaluate(() => {
  const posts = Array.from(document.querySelectorAll("article"));

  for (const post of posts) {
    const likeBtn = post.querySelector('svg[aria-label="Like"]');

    if (likeBtn) {
      const btn = likeBtn.closest("button");
      if (!btn) continue;

      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      btn.click();

      return { status: true };
    }
  }

  return { status: false };
});

let success = result.status;


    // === Kalau gagal total → scroll cari postingan baru ===
    if (!success) {
      console.log(`❌ Like ke-${i + 1} gagal, scroll cari postingan baru...`);
      await page.evaluate(() => window.scrollBy(0, 600));
      await delay(2000);
      continue;
    }

    // Delay antar klik
    await delay(interval);

    // Scroll supaya muncul postingan berikutnya
    await page.evaluate(() => window.scrollBy(0, 500));
    await delay(1500);
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
      
  await autoLike(page, 10, 3000);

  await browser.close();
})();
