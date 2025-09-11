const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ======================
// Load Cookies
// ======================
let cookies = [];
try {
  const raw = fs.readFileSync("./cookies.json", "utf8");
  cookies = JSON.parse(raw);
  console.log("✅ Cookies berhasil dimuat");
} catch (e) {
  console.error("❌ Gagal membaca cookies.json:", e.message);
  process.exit(1);
}

// ======================
// Open Following
// ======================
async function openFollowing(page, username) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(3000);
  } catch (e) {
    console.log("❌ Link following tidak ditemukan:", e.message);
    return false;
  }

  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');
  if (isDialog) {
    console.log("✅ Mode Desktop: dialog following muncul");
    return "dialog";
  }

  if (page.url().includes("/following")) {
    console.log("✅ Mode Mobile: halaman following terbuka");
    return "page";
  }

  console.log("❌ Gagal buka daftar following");
  return false;
}

// ======================
// Auto Unfollow
// ======================
async function autoUnfollow(page, username, limit = 20, interval = 3000) {
  const mode = await openFollowing(page, username);
  if (!mode) return;

  let count = 0;

  while (count < limit) {
    // 1️⃣ Cari tombol "Diikuti" / "Following" pertama
    const diikutiHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
      return buttons.length > 0 ? buttons[0] : null;
    });

    if (!diikutiHandle) {
      console.log("⚠️ Tidak ada tombol 'Diikuti' ditemukan, scroll...");
      await page.evaluate(() => window.scrollBy(0, 400));
      await delay(1500);
      continue;
    }

    // Klik / tap tombol "Diikuti"
    try {
      await diikutiHandle.click();
      console.log(`🔘 Klik Diikuti ke-${count + 1} (click)`);
    } catch {
      try {
        const box = await diikutiHandle.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          console.log(`🔘 Klik Diikuti ke-${count + 1} (tap)`);
        }
      } catch {}
    }

    await delay(1000);

    // 2️⃣ Cari elemen popup "Batal Mengikuti" / "Unfollow"
    const popupHandle = await page.evaluateHandle(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return null;
      const elems = Array.from(dialog.querySelectorAll("*"))
        .filter(el => /Batal Mengikuti|Unfollow/i.test(el.innerText));
      return elems.length > 0 ? elems[0] : null;
    });

    if (popupHandle) {
      try {
        const box = await popupHandle.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
          console.log(`❌ Konfirmasi Unfollow ke-${count + 1} (tap)`);
        } else {
          await page.evaluate(el => el.click(), popupHandle);
          console.log(`❌ Konfirmasi Unfollow ke-${count + 1} (evaluate click)`);
        }
        count++;
      } catch (err) {
        console.log("⚠️ Gagal klik popup:", err.message);
      }
    } else {
      console.log("⚠️ Elemen konfirmasi Unfollow tidak ditemukan, skip akun ini");
    }

    await delay(interval);

    // Scroll sedikit supaya tombol berikutnya terlihat
    if (mode === "dialog") {
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 120);
      });
    } else {
      await page.evaluate(() => window.scrollBy(0, 120));
    }

    await delay(1000);
  }

  console.log(`✅ Selesai Unfollow ${count} akun`);
}

// ======================
// Main
// ======================
(async () => {
  const browser = await puppeteer.launch({
    headless: false, // ganti true kalau mau headless
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Mobile mode
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });

  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil");

  await autoUnfollow(page, "zayrahijab", 5, 3000); // contoh 5 akun, jeda 3 detik

  await browser.close();
})();
