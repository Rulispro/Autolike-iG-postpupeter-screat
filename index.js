const puppeteer = require("puppeteer");
const fs = require("fs");

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

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // ✅ set user-agent & viewport seperti mobile (Kiwi Browser)
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  await page.setCookie(...cookies);

  // buka Instagram
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login dengan cookies berhasil");

  // =====================
  // 1. AUTO LIKE FEED (pakai tap)
  // =====================
  async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike: target ${maxLikes} like`);

  let count = 0;
  const clicked = new Set();

  while (count < maxLikes) {
    // cari tombol like (ikon hati kosong)
    const btns = await page.$$('svg[aria-label="Like"]');

    if (btns.length === 0) {
      console.log("🔄 Tidak ada tombol Like terlihat, scroll dulu...");
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1000);
      continue;
    }

    for (let svg of btns) {
      if (count >= maxLikes) break;

      // ambil parent button dari svg
      const parentBtn = await svg.evaluateHandle(el => el.closest('button'));

      if (parentBtn && !clicked.has(parentBtn)) {
        try {
          await parentBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);

          // bisa pilih salah satu:
          await parentBtn.click();   // lebih stabil
          // await parentBtn.tap();  // kalau mau pakai tap langsung

          count++;
          clicked.add(parentBtn);
          console.log(`❤️ Like ke-${count}`);

          await page.waitForTimeout(interval);
        } catch (err) {
          console.log(`❌ Gagal klik like:`, err.message);
        }
      }
    }

    // scroll lanjut untuk cari postingan baru
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);
  }

  console.log(`✅ Selesai AutoLike, total berhasil: ${count}`);
}

  // =====================
  // 2. AUTO FOLLOW FOLLOWERS TARGET
  // =====================
  async function autoFollowFromTarget(username, total = 10, interval = 3000) {
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector(`a[href="/${username}/followers/"]`);
    await page.click(`a[href="/${username}/followers/"]`);

    await page.waitForSelector('div[role="dialog"] ul');

    let count = 0;
    while (count < total) {
      let followed = await page.evaluate(() => {
        let dialog = document.querySelector('div[role="dialog"] ul');
        if (!dialog) return false;
        let btns = [...dialog.querySelectorAll("button")].filter(
          (b) => b.innerText.trim() === "Ikuti"
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

      await new Promise(r => setTimeout(r, interval));
    }
  }

  await autoFollowFromTarget("instagram", 10, 3000);

  console.log("✅ Selesai semua tugas");
  await browser.close();
})();
