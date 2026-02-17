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

  // Kalau Excel serial number
  if (typeof tgl === "number") {
    const excelDate = XLSX.SSF.parse_date_code(tgl);
    if (!excelDate) return null;

    return `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
  }

  // Kalau string format DD/MM/YYYY
  if (typeof tgl === "string") {
    const parts = tgl.split("/");
    if (parts.length !== 3) return null;

    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
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
    const cleanName = name.trim();

    const rawRows = XLSX.utils.sheet_to_json(
      workbook.Sheets[name],
      { defval: "" }
    );

    // 🔥 BERSIHKAN KEY & VALUE
    const cleanRows = rawRows.map(row => {
      const newRow = {};

      Object.keys(row).forEach(key => {
        const cleanKey = key.trim(); // hapus spasi header
        let value = row[key];

        if (typeof value === "string") {
          value = value.trim(); // hapus spasi isi cell
        }

        newRow[cleanKey] = value;
      });

      return newRow;
    });

    sheets[cleanName] = cleanRows;
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

  
// FORCE CLOSE ANY DIALOG
await page.evaluate(() => {
  const closeButtons = Array.from(document.querySelectorAll("button"))
    .filter(b => b.innerText.match(/OK|Not Now|Nanti/i));

  closeButtons.forEach(btn => btn.click());
});

await page.evaluate(() => {
  document
    .querySelectorAll('div[role="dialog"]')
    .forEach(d => d.remove());
});

// force lain kali besar 
  try {
  const [btn] = await page.$x(
    "//span[contains(text(),'Lain') or contains(text(),'Not') or contains(text(),'Nanti')]"
  );

  if (btn) {
    await btn.click();
    console.log("✅ Popup ditutup (Lain kali / Not Now)");
    await page.waitForTimeout(2000);
  }
} catch {}

  const isLogin = await page.evaluate(() => {
    return document.body.innerText.includes("Log in") === false;
  });

  if (!isLogin) {
    console.log("❌ Belum login, skip akun");
    return;
  }

    //delay 2
  await delay(3000);

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
        document.querySelectorAll('svg[aria-label="Like"]')
      );

      if (likes.length === 0) return false;

      const btn = likes[0];

      btn.scrollIntoView({ block: "center" });

      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

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
  ///screenshot 
await page.evaluate(() => window.focus());
await delay(1000);


    //
  //  await delay(2000); // beri waktu UI berubah
   // await page.screenshot({
     // path: `after_like_${i + 1}.png`
   // });
  //  console.log(`📸 Screenshot AFTER like ke-${i + 1}`);

    ////
    
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

  console.log("🚀 Mulai AutoFollow Followers");
  console.log("🎯 Target:", total);
  console.log("👤 Raw Username:", username);

  // 🔥 Bersihkan username
  if (username.includes("instagram.com")) {
    username = username
      .replace("https://www.instagram.com/", "")
      .split("?")[0]
      .replace("/", "");
  }

  console.log("👤 Username bersih:", username);

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  // 1️⃣ buka profil
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  console.log("📄 URL sekarang:", page.url());

  // 2️⃣ klik followers
  const opened = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const followerLink = links.find(a =>
      a.href.includes("/followers")
    );
    if (!followerLink) return false;
    followerLink.click();
    return true;
  });

  if (!opened) {
    console.log("❌ Gagal klik followers");
    return;
  }

  // 🔥 WAJIB tunggu dialog
  await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
  console.log("✅ Popup followers terbuka");

  await delay(2000);
  console.log("✅ tunggu 2 detik sebelum klik tombol follow/ikuti ");

 
  
  let count = 0;

  while (count < total) {
    let clicked = false;

    // === 1. Evaluate ===
    try {
      clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")]
          .find(b => ["Ikuti", "Follow"].includes(b.innerText.trim()) && b.offsetParent !== null);
        if (!btn) return false;
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.click();
        return true;
      });
      if (clicked) {
        count++;
        console.log(`➕ (evaluate) Follow ke-${count}`);
          // 🕒 beri waktu UI berubah ke "Following"
  await delay(2000);

  // 📸 Screenshot setelah follow
  await page.screenshot({
    path: `after_follow_${count}.png`
  });
        await delay(randomDelay());
        continue;
      }
    } catch {}

    // === 2. page.$x + click ===
    try {
      const btn = await page.$x("//button[text()='Follow' or text()='Ikuti']");
      if (btn.length > 0) {
        await btn[0].click();
        count++;
        console.log(`➕ (page.$) Follow ke-${count}`);
          // 🕒 beri waktu UI berubah ke "Following"
  await delay(2000);

  // 📸 Screenshot setelah follow
  await page.screenshot({
    path: `after_follow_${count}.png`
  });
        await delay(randomDelay());
        continue;
      }
    } catch {}

    // === 3. Tap ===
    try {
      const btn = await page.$x("//button[text()='Follow' or text()='Ikuti']");
      if (btn.length > 0) {
        const box = await btn[0].boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          count++;
          console.log(`➕ (tap) Follow ke-${count}`);
           // 🕒 beri waktu UI berubah ke "Following"
  await delay(2000);

  // 📸 Screenshot setelah follow
  await page.screenshot({
    path: `after_follow_${count}.png`
  });
          await delay(randomDelay());
          continue;
        }
      }
    } catch {}

    // === Scroll jika tidak ada tombol follow ===
    console.log("❌ Tidak ada tombol follow, scroll kebawah cari tombol follow/ikuti......");
await page.evaluate(() => {
  const dialog = document.querySelector('div[role="dialog"] ul') 
              || document.querySelector('div._aano ul');
  if (dialog) dialog.scrollBy(0, 300);
});

    await delay(1000);
  }

  console.log(`✅ AutoFollow selesai, total follow: ${count}`);
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

  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(3000); // jeda 3 detik biar daftar kebuka
  } catch (e) {
    console.log("❌ Link following tidak ditemukan:", e.message);
    return false;
  }

  // Cek desktop (dialog)
  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');
  if (isDialog) {
    console.log("✅ Mode Desktop: dialog following muncul");
    return "dialog";
  }

  // Cek mobile (halaman /following)
  if (page.url().includes("/following")) {
    console.log("✅ Mode Mobile: halaman following terbuka");
    return "page";
  }

  console.log("❌ Gagal buka daftar following");
  return false;
}

// ======================
// AutoFollow
// ==============
/////////
async function autoFollowFollowing(page, username, total, delayMin, delayMax) {

  console.log("🎯 Target:", total);
  console.log("👤 Raw Username:", username);

  if (username.includes("instagram.com")) {
    username = username
      .replace("https://www.instagram.com/", "")
      .split("?")[0]
      .replace("/", "");
  }

  console.log("👤 Username bersih:", username);

  const randomDelay = () =>
    Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2"
  });

  await delay(4000);

  console.log("📄 URL sekarang:", page.url());

  const mode = await openFollowing(page, username);
  if (!mode) return;

  let count = 0;

  while (count < total) {
    // logic follow di sini
    count++;
    await delay(randomDelay());
  }

  console.log(`🎉 FollowFollowing selesai, total: ${count}`);
}

////////
async function runFollowFollowing(page, row) {
  console.log(`\n📝 Mulai FollowFollowing → ${row.account}`);

  const total = Number(row.total) || 0;
  const username = row.link_targetUsername;
  const delayMin = Number(row.delay_min) || 3000;
  const delayMax = Number(row.delay_max) || 6000;

  if (!total || !username) {
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
        //screenshot 
        
        await delay(2000);

        await page.screenshot({
         path: `after_unfollow_${count}.png`
         });
        console.log(`📸 Screenshot AFTER unfollow ke-${count}`);

  
        }
        
        ///
        await delay(randomDelay());
      

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

    console.log("📌 Contoh 1 row LIKE:");
console.log(likeRows[0]);

console.log("📌 Contoh 1 row FOLLOWFOLLOWER:");
console.log(followFollowersRows[0]);

console.log("📌 Contoh 1 row FOLLOWFOLLOWING:");
console.log(followFollowingsRows[0]);

console.log("📌 Contoh 1 row UNFOLLOW:");
console.log(igUnfollowRows[0]);


    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
          ]
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
      ////coba cek
      console.log("RAW tanggal dari Excel:", likeRows[0]?.tanggal);
console.log("TYPE tanggal:", typeof likeRows[0]?.tanggal);


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
   await page.setCookie(...acc.cookies);

      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2"
      });

      await delay(4000);
      
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
