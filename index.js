"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const XLSX = require("xlsx");   
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin())

//PARSE TANGGAL///
function parseTanggalXLSX(tgl) {
  if (!tgl) return null;

  // format: M/D/YY atau MM/DD/YY
  const [m, d, y] = tgl.split("/");

  const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);

  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
 // TEMPLATE XLSX 
function readTemplate(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheets = {};

  workbook.SheetNames.forEach(name => {
    sheets[name] = XLSX.utils.sheet_to_json(
      workbook.Sheets[name],
      { defval: "" }
    );
  });

  return sheets;
}


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
    const likeRows = templates.LIKE || [];
    const followFollowersRows = templates.FOLLOWFOLLOWER || [];
    const followFollowingsRows = templates.FOLLOWFOLLOWING || [];
    const addFriendFollowingRows = templates.UNFOLLOW || [];

    

    const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
    });

    for (const acc of accounts) {

      console.log(`\n🚀 Start akun: ${acc.account}`);
      
      const today = new Date().toISOString().slice(0, 10);

const rowsIGForAccount = igUnfollowRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});

console.log(`📋 igUnfollow row ${acc.account}:`, rowsIGForAccount.length);

if (rowsIGForAccount.length === 0) {
  console.log("⏭️ Tidak ada jadwal IG hari ini");
  continue;
}


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

    const delayRow = rowsIGForAccount.find(r => r.delay_akun);
const delayAkun = Number(delayRow?.delay_akun) || 10000;

console.log("🕒 Delay akun:", delayAkun);
await delay(delayAkun);

    await browser.close();
    console.log("🎉 Semua akun selesai");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
