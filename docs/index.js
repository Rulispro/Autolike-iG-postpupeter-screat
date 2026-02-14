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
    const cleanName = name.trim();   // 🔥 TRIM DI SINI
    sheets[cleanName] = XLSX.utils.sheet_to_json(
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

  //  if (!mode) {
    //  console.log("⚠️ Tidak ada mode → stop");
     // process.exit(0);
  //  }

    const accounts = JSON.parse(
      fs.readFileSync("./docs/accounts.json", "utf8")
    );
    
    //BACA SEKALI
    const TEMPLATE_PATH = "./docs/templateIG.xlsx";

if (!fs.existsSync(TEMPLATE_PATH)) {
  throw new Error("❌ template_ig.xlsx tidak ditemukan");
}

    const templates = readTemplate(TEMPLATE_PATH);
    console.log("📑 Sheet terbaca:", Object.keys(templates));
    const likeRows = templates.LIKE || [];
    const followFollowersRows = templates.FOLLOWFOLLOWER || [];
    const followFollowingsRows = templates.FOLLOWFOLLOWING || [];
    const igUnfollowRows = templates.UNFOLLOW || [];

    

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
      
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();

      await page.setBypassCSP(true); 
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

     
      const today = new Date().toISOString().slice(0, 10);
      //FILTER IG UNFOLLOW 
 const rowsIGForAccount = igUnfollowRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});

console.log(`📋 Igunfollow row ${acc.account}:`, rowsIGForAccount.length);
//console.log(`📋 Status row ${acc.account}:`, rowsStatusForAccount.length);
//console.log(`📋 addFriendFollowers row ${acc.account}:`, rowsAddFriendFollowersForAccount.length);
//console.log(`📋 addFriendFollowings row ${acc.account}:`, rowsAddFriendFollowingForAccount.length); 
//console.log(`📋 addFriendListRows row ${acc.account}:`, rowsAddFriendFriendsForAccount.length);
//console.log(`📋 undfriend row ${acc.account}:`, rowsUndfriendForAccount.length);
    if (rowsIGForAccount.length === 0) {
  console.log("⏭️ Tidak ada jadwal IG hari ini");
  continue;
}

if (mode === "igunfollow") {

  for (const row of rowsIGForAccount) {
    await runIGUnfollow(page, row.target_username);
  }
}

      
      await page.setCookie(...acc.cookies);

      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2"
      });

      await delay(4000);

      

      console.log(`✅ Selesai akun ${acc.account}`);

      await page.close();
     await context.close();
      const delayRow = rowsIGForAccount.find(r => r.delay_akun);
     const delayAkun = Number(delayRow?.delay_akun) || 10000;
       console.log("🕒 Delay akun:", delayAkun);
      await delay(delayAkun);
    
    }

    await browser.close();
    console.log("🎉 Semua akun selesai");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
