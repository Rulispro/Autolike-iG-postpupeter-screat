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
  await page.setCookie(...cookies);

  // buka Instagram
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login dengan cookies berhasil");

  // =====================
  // 1. AUTO LIKE FEED (pakai tap)
  // =====================
  async function autoLike(total = 10, interval = 3000) {
    let count = 0;
    await page.evaluate(() => window.scrollTo(0, 0)); // mulai dari atas

    while (count < total) {
      try {
        const btns = await page.$$('svg[aria-label="Like"]');

        if (btns.length === 0) {
          await page.evaluate(() => window.scrollBy(0, 500));
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // Ambil tombol pertama yang kelihatan
        const btn = btns[0];
        const boundingBox = await btn.boundingBox();

        if (boundingBox) {
          await page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          count++;
          console.log(`❤️ Like ke-${count}`);
        }

        await new Promise(r => setTimeout(r, interval));
      } catch (err) {
        console.error("❌ Gagal klik like:", err);
      }
    }
  }

  await autoLike(10, 3000);

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
