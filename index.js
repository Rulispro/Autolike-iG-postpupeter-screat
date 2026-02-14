"use strict";

const fs = require("fs");
const XLSX = require("xlsx");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());


const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    console.log("🚀 Start Instagram Bot");

    const mode = process.argv[2];
    console.log("🎯 MODE:", mode);

    if (!mode) {
      console.log("⚠️ Tidak ada mode → stop");
      process.exit(0);
    }

    const accounts = JSON.parse(
      fs.readFileSync("./accounts.json", "utf8")
    );
    
    //BACA SEKALI
    const TEMPLATE_PATH = "./docs/template_ig.xlsx";

if (!fs.existsSync(TEMPLATE_PATH)) {
  throw new Error("❌ template_ig.xlsx tidak ditemukan");
}

const templates = readTemplate(TEMPLATE_PATH);
console.log("📑 Sheet terbaca:", Object.keys(templates));

const igUnfollowRows = templates.igUnfollow || [];

    

    const browser = await puppeteer.launch({
      headless: "new", // IG lebih aman non-headless
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    for (const acc of accounts) {

      console.log(`\n🚀 Start akun: ${acc.account}`);

      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();

      // Mobile mode
      await page.setUserAgent(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
      );

      await page.setViewport({
        width: 360,
        height: 687,
        isMobile: true,
        hasTouch: true
      });

      await page.setCookie(...acc.cookies);

      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2"
      });

      await delay(4000);

      if (mode === "igunfollow") {
        await runIGUnfollow(page, acc.target_username);
      }

      console.log(`✅ Selesai akun ${acc.account}`);

      await page.close();
      await context.close();

      await delay(10000); // delay antar akun
    }

    await browser.close();
    console.log("🎉 Semua akun selesai");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
