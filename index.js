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
// 2. AutoLike (versi bookmarklet)
// =====================

async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike, target ${maxLikes} like`);

  // bikin delay sendiri
  const delay = ms => new Promise(r => setTimeout(r, ms));

  let count = 0;
  while (count < maxLikes) {
    let clicked = false;

    // === 1. Coba pakai evaluate ===
    try {
      clicked = await page.evaluate(() => {
        const svg = document.querySelector('svg[aria-label="Suka"], svg[aria-label="Like"]');
        if (!svg) return false;
        const btn = svg.closest('[role=button]');
        if (!btn) return false;
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.click();
        return true;
      });

      if (clicked) {
        count++;
        console.log(`❤️ (evaluate) Klik like ke-${count}`);
        await delay(interval);
        continue;
      }
    } catch (e) {
      console.log("⚠️ Gagal pakai evaluate:", e.message);
    }

    // === 2. Coba pakai page.$ + click ===
    try {
      const btn = await page.$('svg[aria-label="Suka"], svg[aria-label="Like"]');
      if (btn) {
        const parent = await btn.evaluateHandle(el => el.closest('[role=button]'));
        if (parent) {
          await parent.click();
          count++;
          console.log(`❤️ (page.$.click) Klik like ke-${count}`);
          await delay(interval);
          continue;
        }
      }
    } catch (e) {
      console.log("⚠️ Gagal pakai page.$.click:", e.message);
    }

    // === 3. Coba pakai touchscreen.tap ===
    try {
      const btn = await page.$('svg[aria-label="Suka"], svg[aria-label="Like"]');
      if (btn) {
        const box = await btn.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          count++;
          console.log(`❤️ (tap) Klik like ke-${count}`);
          await delay(interval);
          continue;
        }
      }
    } catch (e) {
      console.log("⚠️ Gagal pakai tap:", e.message);
    }

    // === kalau semua gagal → scroll ===
    console.log("❌ Tidak ada tombol like ditemukan, scroll...");
    await page.evaluate(() => window.scrollBy(0, 500));
    await delay(1000);
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
  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });

  console.log("✅ Login dengan cookies berhasil");

  // Jalankan AutoLike
  await autoLike(page, 10, 3000);

  // Jalankan AutoFollow (contoh target: instagram)
  await autoFollowFromTarget(page, "instagram", 5, 3000);

  console.log("🎉 Semua tugas selesai");
  await browser.close();
})();
