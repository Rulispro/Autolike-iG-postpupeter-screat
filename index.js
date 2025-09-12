const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = ms => new Promise(r => setTimeout(r, ms));

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
    headless: true, // ganti false kalau mau lihat browser
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Mode mobile
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });

  await page.setCookie(...cookies);

  const username = "sendy81a"; // ganti username target
  const followingUrl = `https://www.instagram.com/${username}/following/`;

  // Buka halaman following
  await page.goto(followingUrl, { waitUntil: "networkidle2" });
  console.log("✅ Halaman following terbuka");
  await delay(3000);

  // Scroll dan ambil semua tombol "Diikuti / Following"
  let buttonsClicked = 0;
  let moreButtons = true;

  while (moreButtons) {
    // Ambil semua tombol visible
    const btnIndexes = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"))
        .filter(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
      return btns.map((_, idx) => idx);
    });

    if (btnIndexes.length === 0) {
      moreButtons = false;
      break;
    }

    for (let i = 0; i < btnIndexes.length; i++) {
      buttonsClicked++;
      const clicked = await page.evaluate(idx => {
        const btns = Array.from(document.querySelectorAll("button"))
          .filter(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
        if (btns[idx]) {
          btns[idx].scrollIntoView();
          btns[idx].click();
          // Tunggu popup muncul sebentar
        

          return true;
        }
        return false;
      }, i);

      if (!clicked) continue;
      console.log(`🔘 Klik tombol Diikuti #${buttonsClicked}`);
  // Tunggu popup muncul sebentar
    await delay(1500); // bisa ditambah jadi 2000 kalau perlu

      
      // Tunggu popup muncul
      try {
        await page.waitForSelector('div[role="dialog"] button', { visible: true, timeout: 5000 });
      } catch {}

      // Klik tombol Unfollow di popup
      const unfollowClicked = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (!dialog) return false;
        const btn = Array.from(dialog.querySelectorAll("button"))
          .find(b => /Unfollow|Batal Mengikuti/i.test(b.innerText));
        if (btn) {
          btn.scrollIntoView();
          btn.click();
          return true;
        }
        return false;
      });

      if (unfollowClicked) console.log(`❌ Konfirmasi Unfollow diklik #${buttonsClicked}`);
      else {
        console.log(`⚠️ Tombol konfirmasi Unfollow tidak ditemukan #${buttonsClicked}`);

        // Debug tombol di dialog
        const dialogButtons = await page.evaluate(() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return [];
          return Array.from(dialog.querySelectorAll("button"))
            .map(b => ({ text: b.innerText, class: b.className }));
        });
        console.log("🔹 Tombol di popup:", dialogButtons);
      }

      await delay(3000);
      
    // Debug semua div (opsional, kalau Unfollow tidak ditemukan)
const allDivs = await page.evaluate(() => 
  Array.from(document.querySelectorAll('div')).map(d => ({
    text: d.innerText,
    className: d.className
  }))
);
console.log("🔹 Semua div:", allDivs);

    }

    // Scroll ke bawah untuk load tombol baru
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(4000);
  }

  console.log("✅ Selesai proses unfollow semua tombol visible");
  await browser.close();
})();
