const puppeteer = require("puppeteer");
const fs = require("fs");

// ======================
// Helper Delay
// ======================
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
// Open Followers
// ======================
async function openFollowers(page, username) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(`a[href="/${username}/followers/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/followers/"]`);
    console.log("✅ Link followers diklik");
    await delay(2500); // tunggu biar daftar followers kebuka
  } catch (e) {
    console.log("❌ Link followers tidak ditemukan:", e.message);
    return false;
  }

  // Cek desktop (dialog)
  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');
  if (isDialog) {
    console.log("✅ Mode Desktop: dialog followers muncul");
    return "dialog";
  }

  // Cek mobile (halaman /followers/)
  if (page.url().includes("/followers")) {
    console.log("✅ Mode Mobile: halaman followers terbuka");
    return "page";
  }

  console.log("❌ Gagal buka daftar followers");
  return false;
}

// ======================
// AutoFollow
// ======================

async function autoFollow(page, username, maxFollow = 10, interval = 3000) {
  const mode = await openFollowers(page, username);
  if (!mode) return;

  let count = 0;
  while (count < maxFollow) {
    // Cari tombol follow/ikuti via evaluate
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector("button:contains('Ikuti'), button:contains('Follow')");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      count++;
      console.log(`➕ Follow ke-${count}`);
      await delay(interval); // jeda antar follow
      continue;
    }

    // Scroll kalau tombol tidak ada
    if (mode === "dialog") {
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 200);
      });
    } else {
      await page.evaluate(() => window.scrollBy(0, 400));
    }

    await delay(2000); // jeda scroll biar load user baru
  }

  console.log(`🎉 AutoFollow selesai, total follow: ${count}`);
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

  // Set cookies
  await page.setCookie(...cookies);

  // Buka Instagram
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil dengan cookies");

  // Jalankan auto follow target
  await autoFollow(page, "zayrahijab", 5, 3000); // follow 5 orang, jeda 3 detik

  await browser.close();
})();
