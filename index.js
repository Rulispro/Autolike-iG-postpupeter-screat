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

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // biar bisa lihat popup
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Mobile mode
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });

  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/zayrahijab/", { waitUntil: "networkidle2" });
  console.log("✅ Halaman profil terbuka");

  await delay(3000);

  // Klik tombol "Diikuti" pertama
  const diikutiBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
  });

  if (!diikutiBtn) {
    console.log("⚠️ Tombol 'Diikuti' tidak ditemukan");
    await browser.close();
    return;
  }

  // Klik tombol
  try {
    await diikutiBtn.click();
    console.log("🔘 Tombol 'Diikuti' diklik");
  } catch {
    try {
      const box = await diikutiBtn.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        console.log("🔘 Tombol 'Diikuti' di-tap");
      }
    } catch {}
  }

  await delay(1500);

  // DEBUG: tampilkan semua tombol di popup / dialog
  const popupButtons = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll("button")).map(b => ({
      text: b.innerText,
      html: b.outerHTML
    }));
  });

  if (popupButtons.length === 0) {
    console.log("⚠️ Tidak ada tombol di popup");
  } else {
    console.log("✅ Tombol di popup:");
    popupButtons.forEach((b, i) => console.log(`${i + 1}:`, b.text, b.html));
  }

  await browser.close();
})();
