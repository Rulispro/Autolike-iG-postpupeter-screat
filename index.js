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
    let success = false;

    // === Cara 1: evaluate click ===
    try {
      success = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("svg")]
          .find(el =>
            el.getAttribute("aria-label") === "Like" ||
            el.getAttribute("aria-label") === "Suka"
          );

        if (!btn) return false;

        const button = btn.closest("button");
        if (!button) return false;

        button.scrollIntoView({ behavior: "smooth", block: "center" });
        button.click();
        return true;
      });

      if (success) {
        console.log(`❤️ (evaluate) Like ke-${i + 1}`);
      }
    } catch (e) {
      console.log("⚠️ Evaluate error:", e.message);
    }

    // === Cara 2: fallback pakai puppeteer click ===
if (!success) {
  try {
    const btnHandle = await page.$(
      "svg[aria-label='Like'], svg[aria-label='Suka']"
    );

    if (btnHandle) {
      const buttonHandle = await btnHandle.evaluateHandle(el =>
        el.closest("button")
      );

      const elementHandle = buttonHandle.asElement();

      if (elementHandle) {
        await elementHandle.click();
        success = true;
        console.log(`❤️ (puppeteer.click) Like ke-${i + 1}`);
      }
    }
  } catch (e) {
    console.log("⚠️ Puppeteer click error:", e.message);
  }
}
    

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
    headless: new,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  await page.waitForTimeout(4000);

const isLogin = await page.evaluate(() => {
  return document.body.innerText.includes("Log in") === false;
});

console.log("Status login:", isLogin ? "LOGIN" : "BELUM LOGIN");
      
  await autoLike(page, 10, 3000);

  await browser.close();
})();
