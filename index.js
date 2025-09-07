const puppeteer = require("puppeteer");

// ganti dengan cookies Instagram kamu (format array JSON dari DevTools > Application > Cookies > copy all)
const cookies = require("./cookies.json");

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // biar kelihatan prosesnya
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.setCookie(...cookies);

  // buka Instagram
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });

  console.log("✅ Login dengan cookies berhasil");

  // =====================
  // 1. LIKE BERANDA
  // =====================
  async function autoLike(total = 10, interval = 3000) {
    let count = 0;
    await page.evaluate(() => window.scrollTo(0, 0)); // mulai dari atas

    while (count < total) {
      let liked = await page.evaluate(() => {
        let btns = [...document.querySelectorAll('svg[aria-label="Suka"]')]
          .map(svg => svg.closest("button"))
          .filter(btn => btn && btn.offsetParent !== null);
        if (btns.length > 0) {
          btns[0].scrollIntoView({ behavior: "smooth" });
          btns[0].click();
          return true;
        }
        return false;
      });

      if (liked) {
        count++;
        console.log(`❤️ Like ke-${count}`);
      } else {
        await page.evaluate(() => window.scrollBy(0, 500));
      }

      await new Promise(r => setTimeout(r, interval));
    }
  }

  await autoLike(10, 3000);

  // =====================
  // 2 & 3. FOLLOW FOLLOWERS TARGET
  // =====================
  async function autoFollowFromTarget(username, total = 10, interval = 3000) {
    // buka profil target
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: "networkidle2",
    });

    // klik followers
    await page.waitForSelector(`a[href="/${username}/followers/"]`);
    await page.click(`a[href="/${username}/followers/"]`);

    // tunggu popup
    await page.waitForSelector('div[role="dialog"] ul');

    let count = 0;
    while (count < total) {
      let followed = await page.evaluate(() => {
        let dialog = document.querySelector('div[role="dialog"] ul');
        if (!dialog) return false;
        let btns = [...dialog.querySelectorAll("button")]
          .filter(b => b.innerText.trim() === "Ikuti");
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

  // Contoh pakai akun target @instagram
  await autoFollowFromTarget("instagram", 10, 3000);

  // selesai
  console.log("✅ Selesai semua tugas");
  await browser.close();
})();
