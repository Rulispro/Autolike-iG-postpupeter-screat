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

    // === 1. Evaluate click ===
    try {
      success = await page.evaluate(() => {
        const svg = document.querySelector("svg[aria-label='Suka'], svg[aria-label='Like']");
        if (!svg) return false;
        const btn = svg.closest("button,[role=button]");
        if (!btn) return false;
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.click();
        return true;
      });
      if (success) {
        console.log(`❤️ (evaluate) Klik like ke-${i + 1}`);
      }
    } catch (e) {
      console.log("⚠️ Evaluate error:", e.message);
    }

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
async function autoFollowFromTarget(page, username, total = 5, interval = 3000) {
  console.log(`🚀 Mulai AutoFollow dari @${username}, target ${total}`);

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  // buka daftar followers
  await page.waitForSelector(`a[href="/${username}/followers/"]`);
  await page.click(`a[href="/${username}/followers/"]`);

  // tunggu dialog followers muncul
  try {
    await page.waitForSelector('div[role="dialog"] ul', { timeout: 20000 });
  } catch {
    console.log("⚠️ Dialog followers tidak muncul, skip AutoFollow");
    return;
  }

  let count = 0;
  while (count < total) {
    let followed = await page.evaluate(() => {
      let dialog = document.querySelector('div[role="dialog"] ul');
      if (!dialog) return false;

      let btns = [...dialog.querySelectorAll("button")].filter(
        b => b.innerText.trim() === "Ikuti"
      );

      if (btns.length > 0) {
        btns[0].scrollIntoView({ behavior: "smooth" });
        btns[0].click();
        return true;
      }
      return false;
    });

    if (followed) {
      count++;
      console.log(`➕ Follow ke-${count}`);
    } else {
      await page.evaluate(() => {
        let dialog = document.querySelector('div[role="dialog"] ul');
        if (dialog) dialog.scrollBy(0, 200);
      });
    }

    await page.waitForTimeout(interval);
  }

  console.log(`✅ Selesai AutoFollow, total berhasil: ${count}`);
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
  await autoFollowFromTarget(page, "instagram", 5, 3000);

  console.log("🎉 Semua tugas selesai");
  await browser.close();
})();
