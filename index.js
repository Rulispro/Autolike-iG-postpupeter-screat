const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = (ms) => new Promise(res => setTimeout(res, ms));

let cookies = [];
try {
  const raw = fs.readFileSync("./cookies.json", "utf8");
  cookies = JSON.parse(raw);
  console.log("✅ Cookies berhasil dimuat");
} catch (e) {
  console.error("❌ Gagal membaca cookies.json:", e.message);
  process.exit(1);
}

// buka daftar following
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
  return false;
}

// unfollow loop
async function autoUnfollow(page, username, maxUnfollow = 5, interval = 3000) {
  const mode = await openFollowing(page, username);
  if (!mode) return;

  let count = 0;

  while (count < maxUnfollow) {
    let clicked = false;

    // cari tombol "Diikuti" / "Following"
    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b => /Diikuti|Following/i.test(b.innerText.trim()) && b.offsetParent !== null);
      return buttons.length > 0 ? buttons[0] : null;
    });

    if (btnHandle) {
      try {
        await btnHandle.click();
        console.log(`🔘 Klik Diikuti ke-${count + 1}`);
        await delay(1000);

        // cari tombol konfirmasi "Unfollow" / "Batal Mengikuti"
        const confirmBtn = await page.evaluateHandle(() => {
          return Array.from(document.querySelectorAll("button"))
            .find(b => /Batal Mengikuti|Unfollow/i.test(b.innerText));
        });

        if (confirmBtn) {
          await confirmBtn.click();
          console.log(`❌ Unfollow ke-${count + 1}`);
          clicked = true;
        }
      } catch {}
    }

    if (clicked) {
      count++;
      await delay(interval);

      // scroll biar akun baru masuk viewport
      if (mode === "dialog") {
        await page.evaluate(() => {
          const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
          if (dialog) dialog.scrollBy(0, 120);
        });
      } else {
        await page.evaluate(() => window.scrollBy(0, 120));
      }
      await delay(1000);
      continue;
    }

    // kalau tidak ada tombol → scroll jauh
    if (mode === "dialog") {
      console.log("🔄 Scroll dialog cari tombol...");
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 400);
      });
    } else {
      console.log("🔄 Scroll halaman cari tombol...");
      await page.evaluate(() => window.scrollBy(0, 400));
    }
    await delay(1500);
  }

  console.log(`🎉 AutoUnfollow selesai, total: ${count}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil dengan cookies");

  await autoUnfollow(page, "zayrahijab", 5, 3000);

  await browser.close();
})();
