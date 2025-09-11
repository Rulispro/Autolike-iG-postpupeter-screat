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
// 3. AutoFollow Function
// =====================

async function autoFollowFromTarget(page, username, maxFollow = 10, delay = 2000) {
  console.log(`🚀 Mulai AutoFollow dari @${username}, target ${maxFollow}`);

  // 1. Buka halaman profil target
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
    timeout: 60000
  });
  console.log("✅ Halaman profil terbuka");

  // 2. Log semua link untuk debug
  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a")].map(a => a.getAttribute("href"))
  );
  console.log("🔎 Semua link di profil:", links);

  // 3. Cari link followers yang benar
  const found = await page.evaluateHandle((username) => {
    return [...document.querySelectorAll("a")]
      .find(a => a.getAttribute("href")?.includes(`/${username}/followers`));
  }, username);

  if (!found) {
    console.log("❌ Link followers tidak ditemukan");
    return;
  }

  // 4. Klik link followers
  await page.evaluate(el => el.click(), found);
  console.log("✅ Klik link followers berhasil");

  // 5. Screenshot setelah klik (buat bukti dialog kebuka/tidak)
  await page.screenshot({ path: "after-click-followers.png", fullPage: true });
  console.log("📸 Screenshot after-click-followers.png diambil");

  // 6. Tunggu dialog muncul
  await page.waitForSelector('div[role="dialog"]', { timeout: 15000 })
    .catch(() => console.log("⚠️ Dialog followers tidak muncul"));

  // 7. Cari tombol Follow
  const followButtons = await page.$$('div[role="dialog"] button');
  console.log(`🔎 Jumlah tombol follow ditemukan: ${followButtons.length}`);

  let followed = 0;
  for (let btn of followButtons) {
    if (followed >= maxFollow) break;

    const text = await page.evaluate(el => el.innerText, btn);
    if (text === "Follow" || text === "Ikuti") {
      await btn.click();
      followed++;
      console.log(`➕ Follow akun ke-${followed}`);
      await page.waitForTimeout(delay);
    }
  }

  console.log(`✅ AutoFollow selesai, total follow: ${followed}`);
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
