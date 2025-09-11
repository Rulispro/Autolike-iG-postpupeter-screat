const puppeteer = require("puppeteer");
const fs = require("fs");

// =====================
// 1. Load Cookies
// =====================
let cookies = [];
try {
  const raw = fs.readFileSync("./cookies.json", "utf8");
  console.log("---- ISI COOKIES.JSON ----");
  console.log(raw);
  console.log("--------------------------");

  cookies = JSON.parse(raw);
  console.log("✅ Cookies berhasil di-parse, total:", cookies.length);
} catch (err) {
  console.error("❌ Gagal baca cookies.json:", err.message);
  process.exit(1);
}

// =====================
// 2. AutoLike (bookmarklet style)
    async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike, target ${maxLikes} like`);

  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < maxLikes; i++) {
    let success = false;

 //   // === 1. Evaluate click ===
  //  try {
     // success = await page.evaluate(() => {
       // const svg = document.querySelector("svg[aria-label='Suka'], svg[aria-label='Like']");
     //   if (!svg) return false;
      //  const btn = svg.closest("button,[role=button]");
     //   if (!btn) return false;
      //  btn.scrollIntoView({ behavior: "smooth", block: "center" });
      //  btn.click();
      //  return true;
    //  });
    //  if (success) {
    //    console.log(`❤️ (evaluate) Klik like ke-${i + 1}`);
  //    }
  //  } catch (e) {
   //   console.log("⚠️ Evaluate error:", e.message);
 //   }

    // === 2. Puppeteer click ===
    if (!success) {
      try {
        const btnHandle = await page.$("svg[aria-label='Suka'], svg[aria-label='Like']");
        if (btnHandle) {
          const button = await btnHandle.evaluateHandle(el => el.closest("button,[role=button]"));
          if (button) {
            await button.click();
            success = true;
            console.log(`❤️ (puppeteer.click) Klik like ke-${i + 1}`);
          }
        }
      } catch (e) {
        console.log("⚠️ Puppeteer click error:", e.message);
      }
    }

    // === 3. Touchscreen tap ===
    if (!success) {
      try {
        const btnHandle = await page.$("svg[aria-label='Suka'], svg[aria-label='Like']");
        if (btnHandle) {
          const box = await btnHandle.boundingBox();
          if (box) {
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            success = true;
            console.log(`❤️ (tap) Klik like ke-${i + 1}`);
          }
        }
      } catch (e) {
        console.log("⚠️ Tap error:", e.message);
      }
    }

    // === 4. Kalau gagal total → scroll cari postingan baru ===
    if (!success) {
      console.log(`❌ Like ke-${i + 1} gagal, scroll cari postingan baru...`);
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(2000);
      continue;
    }

    // Delay antar klik
    await delay(interval);

    // Scroll setelah klik supaya muncul postingan berikutnya
    await page.evaluate(() => window.scrollBy(0, 400));
    await delay(1500);
  }

  console.log("✅ AutoLike selesai");
}

// =====================
// =====================
// 3. Klik followers dengan 3 cara
// =====================
async function clickFollowersLink(page, username) {
  const selector = `a[href="/${username}/followers/"]`;
  const found = await page.$(selector);
  if (!found) {
    console.log("❌ Link followers tidak ketemu");
    return false;
  }

  // 1️⃣ Tap
  try {
    const box = await found.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      console.log("✅ Followers link ditekan (tap)");
      return true;
    }
  } catch {}

  // 2️⃣ dispatchEvent
  try {
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }
      return false;
    }, selector);
    if (ok) {
      console.log("✅ Followers link diklik (dispatchEvent)");
      return true;
    }
  } catch {}

  // 3️⃣ Klik biasa
  try {
    await found.click();
    console.log("✅ Followers link diklik (.click)");
    return true;
  } catch {}

  console.log("❌ Semua metode klik followers gagal");
  return false;
}

// =====================
// 3. Klik followers dengan 3 cara (update)
// =====================
async function clickFollowersLink(page, username) {
  let selectorList = [
    `a[href="/${username}/followers/"]`,
    'a[href$="/followers/"]',
    'a[href*="followers"]',
    'a:has(span:contains("Pengikut"))',
    'a:has(span:contains("Followers"))'
  ];

  let found = null;
  for (const sel of selectorList) {
    found = await page.$(sel).catch(() => null);
    if (found) {
      console.log(`✅ Link followers ketemu pakai selector: ${sel}`);
      break;
    }
  }

  if (!found) {
    console.log("❌ Link followers tidak ketemu di halaman profil");
    return false;
  }

  // 1️⃣ Tap
  try {
    const box = await found.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      console.log("✅ Followers link ditekan (tap)");
      return true;
    }
  } catch {}

  // 2️⃣ dispatchEvent
  try {
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }
      return false;
    }, selectorList[0]);
    if (ok) {
      console.log("✅ Followers link diklik (dispatchEvent)");
      return true;
    }
  } catch {}

  // 3️⃣ Klik biasa
  try {
    await found.click();
    console.log("✅ Followers link diklik (.click)");
    return true;
  } catch {}

  console.log("❌ Semua metode klik followers gagal");
  return false;
}

// =====================
// 4. AutoFollow Function
// =====================

// =====================
// 4. AutoFollow Function (versi fix desktop & mobile)
// =====================
async function autoFollowFromTarget(page, username, total = 5, interval = 3000) {
  console.log(`🚀 Mulai AutoFollow dari @${username}, target ${total}`);

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });
  console.log("✅ Halaman profil terbuka");

  const ok = await clickFollowersLink(page, username);
  if (!ok) return;

  // === Handle Desktop (dialog) vs Mobile (halaman baru) ===
  let isDialog = false;
  try {
    await page.waitForSelector('div[role="dialog"] ul, div._aano ul', { timeout: 8000 });
    console.log("✅ Mode Desktop: dialog followers muncul");
    isDialog = true;
  } catch {
    // cek kalau dia pindah ke halaman /followers/
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 }).catch(() => {});
    if (page.url().includes("/followers")) {
      console.log("✅ Mode Mobile: halaman followers terbuka");
    } else {
      console.log("❌ Gagal buka daftar followers");
      return;
    }
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));
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
        await delay(interval);
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
        await delay(interval);
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
          await delay(interval);
          continue;
        }
      }
    } catch {}

    // === Scroll jika tidak ada tombol follow ===
    if (isDialog) {
      console.log("❌ Tidak ada tombol follow, scroll dialog...");
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 200);
      });
    } else {
      console.log("❌ Tidak ada tombol follow, scroll halaman...");
      await page.evaluate(() => window.scrollBy(0, 500));
    }
    await delay(1000);
  }

  console.log(`✅ AutoFollow selesai, total follow: ${count}`);
}

// =====================
// 4. Main Flow
// =====================
(async () => {
  const browser = await puppeteer.launch({
    headless: true, // ganti false kalau mau lihat UI
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // === SET MOBILE MODE + BAHASA ===
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login dengan cookies berhasil");

  console.log("URL sekarang:", page.url());
  await page.screenshot({ path: "debug.png", fullPage: true });

  // Jalankan AutoLike
  await autoLike(page, 10, 3000);

  // Jalankan AutoFollow (contoh target: instagram)
  await autoFollowFromTarget(page, "zayrahijab", 5, 3000);

  console.log("🎉 Semua tugas selesai");
  await browser.close();
})();
