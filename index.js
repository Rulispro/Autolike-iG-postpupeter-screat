const puppeteer = require("puppeteer");
const fs = require("fs");

// =============== Load Cookies ===============
let cookies = [];
try {
  const raw = fs.readFileSync("./cookies.json", "utf8");
  cookies = JSON.parse(raw);
  console.log("✅ Cookies berhasil dimuat, total:", cookies.length);
} catch (err) {
  console.error("❌ Gagal baca cookies.json:", err.message);
  process.exit(1);
}

// =============== Helper Delay ===============
const delay = ms => new Promise(r => setTimeout(r, ms));

// =============== Open Followers ===============
async function openFollowers(page, username) {
  console.log(`🚀 Buka followers dari @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(`a[href="/${username}/followers/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/followers/"]`);
    console.log("✅ Link followers diklik");
  } catch (e) {
    console.log("❌ Link followers tidak ditemukan:", e.message);
    return false;
  }

  try {
    await page.waitForSelector('div[role="dialog"] ul, div._aano ul', { timeout: 8000 });
    console.log("✅ Mode Desktop: dialog followers muncul");
    return "dialog";
  } catch {
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 }).catch(() => {});
    if (page.url().includes("/followers")) {
      console.log("✅ Mode Mobile: halaman followers terbuka");
      return "page";
    }
  }

  console.log("❌ Gagal buka daftar followers");
  return false;
}

// =============== Auto Follow ===============
async function autoFollow(page, username, maxFollow = 10, interval = 3000) {
  const mode = await openFollowers(page, username);
  if (!mode) return;

  let count = 0;

  while (count < maxFollow) {
    const btn = await page.$x("//button[text()='Ikuti' or text()='Follow']");
    if (btn.length > 0) {
      try {
        await btn[0].click();
        count++;
        console.log(`➕ Follow ke-${count}`);
      } catch (e) {
        console.log("⚠️ Klik follow gagal:", e.message);
      }
    } else {
      if (mode === "dialog") {
        await page.evaluate(() => {
          const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
          if (dialog) dialog.scrollBy(0, 200);
        });
      } else {
        await page.evaluate(() => window.scrollBy(0, 400));
      }
    }

    await delay(interval);
  }

  console.log(`✅ AutoFollow selesai, total follow: ${count}`);
}

// =============== Main Flow ===============
(async () => {
  const browser = await puppeteer.launch({
    headless: true, // set true kalau mau tanpa UI
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login berhasil");

  // Jalankan AutoFollow target
  await autoFollow(page, "zayrahijab", 10, 3000);

  console.log("🎉 Semua tugas selesai");
  await browser.close();
})();
