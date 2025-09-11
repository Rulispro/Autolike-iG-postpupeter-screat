const puppeteer = require("puppeteer");
const fs = require("fs");

// ======================
// Helper Delay
// ======================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

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
// Buka daftar Following
// ======================
async function openFollowing(page, username) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, {
      timeout: 8000,
    });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(3000);
  } catch (e) {
    console.log("❌ Link following tidak ditemukan:", e.message);
    return false;
  }

  const isDialog = await page.$("div[role='dialog'] ul, div._aano ul");
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

// ======================
// Auto Unfollow
// ======================
async function autoUnfollow(page, limit = 10, interval = 3000) {
  let count = 0;

  while (count < limit) {
    try {
      // cari tombol "Diikuti"
      const buttons = await page.$$("button");

      let targetBtn = null;
      for (let i = 0; i < buttons.length; i++) {
        const text = await page.evaluate((el) => el.innerText, buttons[i]);
        if (/Diikuti|Following/i.test(text)) {
          targetBtn = buttons[i];
          break;
        }
      }

      if (!targetBtn) {
        console.log("⚠️ Tidak ada tombol 'Diikuti' yang bisa diklik, stop.");
        break;
      }

      // klik tombol "Diikuti"
      await targetBtn.click();
      console.log(`🔘 Klik Diikuti ke-${count + 1}`);

      // tunggu popup konfirmasi
      try {
        await page.waitForSelector("div[role=dialog], div._a9-v", {
          timeout: 5000,
        });
      } catch {
        console.log("⚠️ Popup konfirmasi tidak muncul, skip akun ini");
        await page.evaluate((el) =>
          el.scrollIntoView({ behavior: "smooth", block: "center" }),
          targetBtn
        );
        await page.evaluate(() => window.scrollBy(0, 100));
        continue;
      }

      // cari tombol konfirmasi "Batal Mengikuti / Unfollow"
   //   const confirmBtn = await page.evaluateHandle(() => {
      //  const btns = Array.from(document.querySelectorAll("button"));
     //   return btns.find((b) =>
    //      /Batal Mengikuti|Unfollow/i.test(b.innerText.trim())
   //     );
 //     });

 //     if (confirmBtn) {
  //      await confirmBtn.click();
   //     console.log(`❌ Unfollow ke-${count + 1}`);
   //     count++;
 //     } else {
   //     console.log("⚠️ Tombol 'Batal Mengikuti' tidak ditemukan, skip akun ini");
  //    }
// cari tombol konfirmasi "Batal Mengikuti / Unfollow"
const confirmBtns = await page.$x(
  "//button[contains(text(),'Batal Mengikuti') or contains(text(),'Unfollow')]"
);

if (confirmBtns.length > 0) {
  await confirmBtns[0].click();
  console.log(`❌ Unfollow ke-${count + 1}`);
  count++;
} else {
  console.log("⚠️ Tombol 'Batal Mengikuti' tidak ditemukan, skip akun ini");
}
      
      // jeda sebelum lanjut
      await delay(interval);

      // scroll supaya akun berikutnya terlihat
      await page.evaluate(() => window.scrollBy(0, 150));
      await delay(1000);
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

  // set cookies
  await page.setCookie(...cookies);

  // login
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil dengan cookies");

  // buka daftar following user target
  const username = "zayrahijab"; // ganti sesuai target
  const mode = await openFollowing(page, username);
  if (!mode) {
    console.log("❌ Gagal buka daftar following");
    await browser.close();
    return;
  }

  // jalankan unfollow
  await autoUnfollow(page, 5, 3000); // 5 akun, jeda 3 detik

  await browser.close();
})();
