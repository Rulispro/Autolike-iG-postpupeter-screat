const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = (ms) => new Promise(r => setTimeout(r, ms));

let cookies = [];
try {
  cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf8"));
  console.log("✅ Cookies dimuat");
} catch (e) {
  console.error("❌ Gagal baca cookies.json:", e.message);
  process.exit(1);
}

async function autoUnfollow(page, username, limit = 5, interval = 3000) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "networkidle2" });

  // Buka daftar following
  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(3000);
  } catch (e) {
    console.log("❌ Link following tidak ditemukan:", e.message);
    return;
  }

  let count = 0;
  while (count < limit) {
    // 1️⃣ ambil tombol "Diikuti"
    const targetBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null) || null;
    });

    const targetBtn = targetBtnHandle.asElement();
    if (!targetBtn) {
      console.log("⚠️ Tidak ada tombol 'Diikuti' ditemukan, scroll...");
      await page.evaluate(() => window.scrollBy(0, 300));
      await delay(1500);
      continue;
    }

    // klik tombol "Diikuti"
    try {
      await targetBtn.click();
      console.log(`🔘 Klik Diikuti ke-${count + 1}`);
    } catch {
      try {
        const box = await targetBtn.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          console.log(`🔘 Tap Diikuti ke-${count + 1}`);
        }
      } catch {}
    }

    await delay(1500);

    // 2️⃣ cek popup / konfirmasi
    const confirmClicked = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return false;
      const btn = Array.from(dialog.querySelectorAll("button"))
        .find(b => /Batal Mengikuti|Unfollow/i.test(b.innerText));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (confirmClicked) {
      console.log(`❌ Unfollow ke-${count + 1} (popup)`);
      count++;
    } else {
      // 3️⃣ cek apakah tombol berubah jadi "Ikuti"
      const stillFollowing = await page.evaluate(el => el.innerText, targetBtn).catch(() => "");
      if (/Ikuti|Follow/i.test(stillFollowing)) {
        console.log(`✅ Unfollow ke-${count + 1} (langsung tanpa popup)`);
        count++;
      } else {
        console.log("⚠️ Tombol konfirmasi tidak muncul & status tidak berubah, skip akun ini");
      }
    }

    await delay(interval);
    await page.evaluate(() => window.scrollBy(0, 150));
  }

  console.log(`🎉 Selesai unfollow ${count} akun`);
}

// ======================
// Main
// ======================
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Mode mobile
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });

  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil");

  await autoUnfollow(page, "zayrahijab", 5, 3000);

  await browser.close();
})();
