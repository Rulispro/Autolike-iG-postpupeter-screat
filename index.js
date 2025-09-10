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
// 2. AutoLike Function
// =====================
async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike: target ${maxLikes} like`);

  let count = 0;
  const clicked = new Set();

  while (count < maxLikes) {
    // cari tombol like (bisa "Like" atau "Suka")
    const btns = await page.$$('svg[aria-label="Like"], svg[aria-label="Suka"]');

    if (btns.length === 0) {
      console.log("🔄 Tidak ada tombol Like terlihat, scroll dulu...");
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(1500);
      continue;
    }

    for (let svg of btns) {
      if (count >= maxLikes) break;

      // ambil parent button dari svg
      const parentBtn = await svg.evaluateHandle(el => el.closest("button"));

      if (parentBtn && !clicked.has(parentBtn)) {
        try {
          await parentBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);

          await parentBtn.click(); // klik ❤️

          count++;
          clicked.add(parentBtn);
          console.log(`❤️ Like ke-${count}`);

          await page.waitForTimeout(interval);
        } catch (err) {
          console.log(`❌ Gagal klik like:`, err.message);
        }
      }
    }

    // scroll ke bawah untuk cari posting baru
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);
  }

  console.log(`✅ Selesai AutoLike, total berhasil: ${count}`);
}

// =====================
// 3. AutoFollow Function
// =====================
async function autoFollowFromTarget(page, username, total = 10, interval = 3000) {
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
