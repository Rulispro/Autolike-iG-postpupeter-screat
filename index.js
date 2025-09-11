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
    headless: true,
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

  // Klik tombol "Diikuti"
  const diikutiBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
  });

  if (!diikutiBtn) {
    console.log("⚠️ Tombol 'Diikuti' tidak ditemukan");
    await browser.close();
    return;
  }

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

  // DEBUG: tampilkan semua elemen di popup
  const popupElements = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll("*")).map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      class: el.className,
      html: el.outerHTML
    }));
  });

  if (popupElements.length === 0) {
    console.log("⚠️ Tidak ada elemen di popup");
  } else {
    console.log("✅ Elemen popup ditemukan:");
    popupElements.forEach((el, i) => {
      console.log(`${i + 1}: [${el.tag}] "${el.text}" class="${el.class}"`);
    });
  }

  // Cari tombol "Batal Mengikuti" / "Unfollow" di popup
  const popupElement = await page.evaluateHandle(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return null;
    const targets = Array.from(dialog.querySelectorAll("*"))
      .filter(el => /Batal Mengikuti|Unfollow/i.test(el.innerText));
    return targets.length > 0 ? targets[0] : null;
  });

  if (popupElement) {
    try {
      const box = await popupElement.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
        console.log("❌ Konfirmasi Unfollow diklik/tap");
      } else {
        await page.evaluate(el => el.click(), popupElement);
        console.log("❌ Konfirmasi Unfollow diklik evaluate");
      }
    } catch (err) {
      console.log("⚠️ Gagal klik popup:", err.message);
    }
  } else {
    console.log("⚠️ Elemen konfirmasi Unfollow tidak ditemukan");
  }

  await browser.close();
})();
