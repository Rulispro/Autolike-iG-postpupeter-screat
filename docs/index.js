"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const XLSX = require("xlsx");   
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin())
//log row template 
function logTemplateRow(mode, row) {
  console.log("📄 ================================");
  console.log(`📄 MODE        : ${mode}`);
  console.log(`👤 ACCOUNT     : ${row.account}`);
  console.log(`📅 TANGGAL     : ${row.tanggal}`);
  console.log(`🎯 TOTAL       : ${row.total}`);
  console.log(`⏳ DELAY MIN   : ${row.delay_min}`);
  console.log(`⏳ DELAY MAX   : ${row.delay_max}`);
  console.log(`🕒 DELAY AKUN  : ${row.delay_akun || "-"}`);
  console.log(`🎯 TARGET USER : ${row.link_targetUsername || row.target_Username || "-"}`);
  console.log("📄 ================================");
}

//PARSE TANGGAL///
function parseTanggalXLSX(tgl) {
  if (!tgl) return null;

  // format: M/D/YY atau MM/DD/YY
  const [m, d, y] = tgl.split("/");

  const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);

  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
//)
async function openFollowingSelf(page, username) {
  console.log(`🚀 Buka following @${username}`);

  await page.goto(`https://www.instagram.com/${username}/following/`, {
    waitUntil: "networkidle2",
  });

  await delay(4000);

  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');

  if (isDialog) return "dialog";
  if (page.url().includes("/following")) return "page";

  return false;
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
///===FUNGSI LIKE===///
async function runLike(page, row) {
  console.log(`\n📝 Mulai Like → ${row.account}`);

  // Ambil langsung dari template
  const total = Number(row.total) || 0;
  const delayMin = Number(row.delay_min) || 2000;
  const delayMax = Number(row.delay_max) || 4000;

  if (total <= 0) {
    console.log("⚠️ Total kosong, skip");
    return;
  }

  await page.goto("https://www.instagram.com/", {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  const isLogin = await page.evaluate(() => {
    return document.body.innerText.includes("Log in") === false;
  });

  if (!isLogin) {
    console.log("❌ Belum login, skip akun");
    return;
  }

  // 👇 AUTO NGIKUT TEMPLATE
  await autoLike(page, total, delayMin, delayMax);

  console.log(`✅ Like selesai untuk ${row.account}`);
}

  // 👇 AUTO NGIKUT TEMPLATE
async function autoLike(page, total, delayMin, delayMax) {
  console.log(`🚀 Mulai AutoLike`);
  console.log(`🎯 Target: ${total}`);
  console.log(`⏳ Delay: ${delayMin} - ${delayMax}`);

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  for (let i = 0; i < total; i++) {

    const result = await page.evaluate(() => {
      const likes = Array.from(
        document.querySelectorAll('svg[aria-label="Like"], svg[aria-label="Suka"]')
      );

      if (likes.length === 0) return false;

      const btn = likes[0];
      btn.scrollIntoView({ block: "center" });

      btn.closest("button")?.click();

      return true;
    });

    if (!result) {
      console.log(`❌ Like ke-${i + 1} gagal, scroll...`);
      await page.evaluate(() => window.scrollBy(0, 900));
      await delay(2500);
      i--;
      continue;
    }

    console.log(`❤️ Like ke-${i + 1} berhasil`);

    await delay(randomDelay());
    await page.evaluate(() => window.scrollBy(0, 700));
    await delay(2000);
  }

  console.log("✅ AutoLike selesai");
}
// =====================
// AUTO FOLLOW FOLLOWERS
// =====================
async function autoFollow(page, username, total, delayMin, delayMax) {

  console.log(`🚀 Mulai AutoFollow Followers`);
  console.log(`🎯 Target: ${total}`);
  console.log(`👤 Username: ${username}`);
  console.log(`⏳ Delay: ${delayMin} - ${delayMax}`);

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  // buka followers target
  await page.goto(`https://www.instagram.com/${username}/followers/`, {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  let count = 0;

  while (count < total) {

    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b =>
          ["Ikuti", "Follow"].includes(b.innerText.trim()) &&
          b.offsetParent !== null
        );

      return buttons.length > 0 ? buttons[0] : null;
    });

    if (btnHandle) {
      try {
        await btnHandle.click();
        count++;
        console.log(`➕ Follow ke-${count}`);
        await delay(randomDelay());
      } catch {
        console.log("⚠️ Gagal klik, lanjut scroll");
      }
    }

    // scroll list followers
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"] ul');
      if (dialog) {
        dialog.scrollBy(0, 400);
      } else {
        window.scrollBy(0, 400);
      }
    });

    await delay(2000);
  }

  console.log(`🎉 AutoFollow selesai, total follow: ${count}`);
}

//==fungsi auto follow followers 
async function runFollowFollower(page, row) {
  console.log(`\n📝 Mulai FollowFollower → ${row.account}`);

  const total = Number(row.total) || 0;
  const username = row.link_targetUsername;
  const delayMin = Number(row.delay_min) || 3000;
  const delayMax = Number(row.delay_max) || 6000;

  if (!total || !username) {
    console.log("⚠️ Data tidak lengkap, skip");
    return;
  }

  // buka home dulu
  await page.goto("https://www.instagram.com/", {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  // cek login
  const isLogin = await page.evaluate(() => {
    return document.body.innerText.includes("Log in") === false;
  });

  if (!isLogin) {
    console.log("❌ Belum login, skip akun");
    return;
  }

  // 🔥 AUTO NGIKUT TEMPLATE XLSX
  await autoFollow(page, username, total, delayMin, delayMax);

  console.log(`✅ FollowFollower selesai untuk ${row.account}`);
}

//Helper 
async function openFollowing(page, username) {
  console.log(`🚀 Buka profil @${username}`);

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  await delay(4000);

  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(4000);
  } catch (e) {
    console.log("❌ Link following tidak ditemukan");
    return false;
  }

  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');

  if (isDialog) return "dialog";
  if (page.url().includes("/following")) return "page";

  return false;
}
/////////
async function autoFollowFollowing(page, username, total, delayMin, delayMax) {

  console.log(`🚀 Mulai Follow Following`);
  console.log(`🎯 Target: ${total}`);
  console.log(`⏳ Delay: ${delayMin}-${delayMax}`);

  const mode = await openFollowing(page, username);
  if (!mode) return;

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  let count = 0;

  while (count < total) {

    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b =>
          ["Ikuti", "Follow"].includes(b.innerText.trim()) &&
          b.offsetParent !== null
        );

      return buttons.length > 0 ? buttons[0] : null;
    });

    if (btnHandle) {
      try {
        await btnHandle.click();
        count++;
        console.log(`➕ Follow ke-${count}`);
        await delay(randomDelay());
      } catch {
        console.log("⚠️ Gagal klik");
      }
    }

    // scroll
    if (mode === "dialog") {
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') ||
                       document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 400);
      });
    } else {
      await page.evaluate(() => window.scrollBy(0, 400));
    }

    await delay(1500);
  }

  console.log(`🎉 FollowFollowing selesai, total: ${count}`);
}
////////
async function runFollowFollowing(page, row) {
  console.log(`\n📝 Mulai FollowFollowing → ${row.account}`);

  const total = Number(row.total) || 0;
  const targetUsername = row.target_Username;
  const delayMin = Number(row.delay_min) || 3000;
  const delayMax = Number(row.delay_max) || 6000;

  if (!total || !targetUsername) {
    console.log("⚠️ Data tidak lengkap, skip");
    return;
  }

  await page.goto("https://www.instagram.com/", {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  const isLogin = await page.evaluate(() => {
    return document.body.innerText.includes("Log in") === false;
  });

  if (!isLogin) {
    console.log("❌ Belum login, skip akun");
    return;
  }

  // 🔥 AUTO NGIKUT ROW XLSX
  await autoFollowFollowing(page, targetUsername, total, delayMin, delayMax);

  console.log(`✅ FollowFollowing selesai untuk ${row.account}`);
}


////unfollow 
async function runIGUnfollow(page, row) {
  console.log(`\n📝 Mulai Unfollow → ${row.account}`);

  const username = row.account; // unfollow dari akun sendiri
  const total = Number(row.total) || 0;
  const delayMin = Number(row.delay_min) || 4000;
  const delayMax = Number(row.delay_max) || 7000;

  if (!total) {
    console.log("⚠️ Total kosong, skip");
    return;
  }

  await page.goto("https://www.instagram.com/", {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  const isLogin = await page.evaluate(() => {
    return document.body.innerText.includes("Log in") === false;
  });

  if (!isLogin) {
    console.log("❌ Belum login, skip akun");
    return;
  }

  // 🔥 AUTO NGIKUT XLSX
  await autoUnfollow(page, username, total, delayMin, delayMax);

  console.log(`✅ Unfollow selesai untuk ${row.account}`);
}

//////)
async function autoUnfollow(page, username, total, delayMin, delayMax) {

  console.log(`🚀 Mulai Unfollow`);
  console.log(`🎯 Target: ${total}`);
  console.log(`⏳ Delay: ${delayMin}-${delayMax}`);

  const mode = await openFollowingSelf(page, username);
  if (!mode) return;

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  let count = 0;

  while (count < total) {

    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b =>
          /Diikuti|Following/i.test(b.innerText.trim()) &&
          b.offsetParent !== null
        );

      return buttons.length > 0 ? buttons[0] : null;
    });

    if (!btnHandle) {
      console.log("🔄 Scroll cari tombol...");
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') ||
                       document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 400);
        else window.scrollBy(0, 400);
      });
      await delay(2000);
      continue;
    }

    try {
      await btnHandle.click();
      console.log(`🔘 Klik Following ke-${count + 1}`);
      await delay(1500);

      const confirmClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button"))
          .find(b => /Batal mengikuti|Unfollow/i.test(b.innerText));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (confirmClicked) {
        count++;
        console.log(`❌ Unfollow ke-${count} berhasil`);
        await delay(randomDelay());
      }

    } catch {
      console.log("⚠️ Gagal klik tombol");
    }
  }

  console.log(`🎉 Unfollow selesai, total: ${count}`);
}


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
      executablePath: "/usr/bin/google-chrome",
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

     
      const today = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
)
  .toISOString()
  .slice(0, 10);

console.log("🗓 TODAY WIB:", today);

      //FILTER LIKE
      const rowsIGLikeForAccount = likeRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //FILTER FOLLOWERS 
  const rowsIGFollowFollowerForAccount = followFollowersRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //FILTER FOLLOWFOLLOWING
  const rowsIGFollowFollowingForAccount = followFollowingsRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //FILTER IG UNFOLLOW 
 const rowsIGUnfollowForAccount = igUnfollowRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});

console.log(`📋 likeRows row ${acc.account}:`, rowsIGLikeForAccount.length);
console.log(`📋 followFollowersRows row ${acc.account}:`, rowsIGFollowFollowerForAccount.length);
console.log(`📋 followFollowingsRows row ${acc.account}:`, rowsIGFollowFollowingForAccount.length);
console.log(`📋 igUnfollowRows row ${acc.account}:`, rowsIGUnfollowForAccount.length); 
//console.log(`📋 addFriendListRows row ${acc.account}:`, rowsAddFriendFriendsForAccount.length);
//console.log(`📋 undfriend row ${acc.account}:`, rowsUndfriendForAccount.length);
    if (rowsIGLikeForAccount.length === 0 && rowsIGFollowFollowerForAccount.length === 0 && rowsIGFollowFollowingForAccount.length === 0 && rowsIGUnfollowForAccount.length === 0) {
  console.log("⏭️ Tidak ada jadwal IG hari ini");
  continue;
}
     //LAKUKAN LIKE
      if (mode === "Like") {

  for (const row of rowsIGLikeForAccount) {
   logTemplateRow("LIKE", row);
    await runLike(page, row);
  }
}
     //LAKUKAN FOLLOW FOLLOWER
      if (mode === "FollowFollower") {

  for (const row of rowsIGFollowFollowerForAccount) {
     logTemplateRow("LIKE", row);
    await runFollowFollower(page, row);
  }
}
      //LAKUKAN FOLLOW FOLOWING
      if (mode === "FollowFollowing") {

  for (const row of rowsIGFollowFollowingForAccount) {
    logTemplateRow("LIKE", row);
    await runFollowFollowing(page, row);
  }
}
   //, LAKUKAN UNFOLLOW  
if (mode === "Unfollow") {

  for (const row of rowsIGUnfollowForAccount) {
    logTemplateRow("LIKE", row);
    await runIGUnfollow(page, row);
  }
}

      
      await page.setCookie(...acc.cookies);

      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2"
      });

      await delay(4000);

      

      console.log(`✅ Selesai akun ${acc.account}`);

      await page.close();
      let activeRows = [];

if (mode === "Like") activeRows = rowsIGLikeForAccount;
if (mode === "FollowFollower") activeRows = rowsIGFollowFollowerForAccount;
if (mode === "FollowFollowing") activeRows = rowsIGFollowFollowingForAccount;
if (mode === "Unfollow") activeRows = rowsIGUnfollowForAccount;

const delayRow = activeRows.find(r => r.delay_akun);
const delayAkun = Number(delayRow?.delay_akun) || 10000;

console.log("🕒 Delay akun:", delayAkun);
await delay(delayAkun);

     await context.close();
 }
    
    await browser.close();
    console.log("🎉 Semua akun selesai");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
