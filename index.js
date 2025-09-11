const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
// Auto Unfollow
// ======================
async function autoUnfollow(page, username, limit = 10, interval = 3000) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "networkidle2" });

  // buka daftar following
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
    try {
      // cari tombol "Diikuti"
      const targetBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
      });

      if (!targetBtn) {
        console.log("⚠️ Tidak ada tombol 'Diikuti' ditemukan.");
        break;
      }

      // klik tombol "Diikuti"
      await targetBtn.click();
      console.log(`🔘 Klik Diikuti ke-${count + 1}`);
      await delay(1500);

      // cek popup konfirmasi dan klik tombol "Batal Mengikuti"/"Unfollow"
      const confirmClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const confirm = buttons.find(b => /Batal Mengikuti|Unfollow/i.test(b.innerText));
        if (confirm) {
          confirm.click();
          return true;
        }
        return false;
      });

      if (confirmClicked) {
        console.log(`❌ Unfollow ke-${count + 1} (popup)`);
        count++;
      } else {
        // cek apakah tombol berubah jadi "Ikuti"
        const stillFollowing = await page.evaluate(el => el.innerText, targetBtn).catch(() => "");
        if (/Ikuti|Follow/i.test(stillFollowing)) {
          console.log(`✅ Unfollow ke-${count + 1} (langsung tanpa popup)`);
          count++;
        } else {
          console.log("⚠️ Tombol konfirmasi tidak muncul & status tidak berubah → skip akun ini");
        }
      }

      await delay(interval);
      await page.evaluate(() => window.scrollBy(0, 150)); // scroll sedikit supaya tombol berikutnya terlihat

    } catch (err) {
      console.log("❌ Error:", err.message);
      break;
    }
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

  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil dengan cookies");

  await autoUnfollow(page, "zayrahijab", 5, 3000); // Unfollow 5 akun, jeda 3 detik

  await browser.close();
})();
