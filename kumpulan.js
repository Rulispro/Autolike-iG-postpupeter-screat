//====SCRIPT FOLLOW FOLLOWERS NYA
async function autoFollow(page, username, maxFollow = 10, interval = 3000) {
  const mode = await openFollowers(page, username);
  if (!mode) return;

  let count = 0;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  while (count < maxFollow) {
    let clicked = false;

    // cari tombol pertama di viewport
    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b => ["Ikuti", "Follow"].includes(b.innerText.trim()) && b.offsetParent !== null);
      return buttons.length > 0 ? buttons[0] : null;
    });

    if (btnHandle) {
      try {
        await btnHandle.click();
        clicked = true;
        console.log(`➕ Follow ke-${count + 1} (click)`);
      } catch {
        // fallback tap
        try {
          const box = await btnHandle.boundingBox();
          if (box) {
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            clicked = true;
            console.log(`➕ Follow ke-${count + 1} (tap)`);
          }
        } catch {}
      }
    }

    if (clicked) {
      count++;
      await delay(interval);

      // scroll sedikit supaya akun berikutnya naik
      if (mode === "dialog") {
        await page.evaluate(() => {
          const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
          if (dialog) dialog.scrollBy(0, 120); // scroll kecil
        });
      } else {
        await page.evaluate(() => window.scrollBy(0, 120));
      }

      await delay(1000);
      continue;
    }

    // kalau tidak ada tombol → scroll agak jauh
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

  console.log(`🎉 AutoFollow selesai, total follow: ${count}`);
}

//====SCRIPT FOLLOWINGNYA===///
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
// Open Following
// ======================
async function openFollowing(page, username) {
  console.log(`🚀 Buka profil @${username}`);
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(`a[href="/${username}/following/"]`, { timeout: 8000 });
    await page.click(`a[href="/${username}/following/"]`);
    console.log("✅ Link following diklik");
    await delay(3000); // jeda 3 detik biar daftar kebuka
  } catch (e) {
    console.log("❌ Link following tidak ditemukan:", e.message);
    return false;
  }

  // Cek desktop (dialog)
  const isDialog = await page.$('div[role="dialog"] ul, div._aano ul');
  if (isDialog) {
    console.log("✅ Mode Desktop: dialog following muncul");
    return "dialog";
  }

  // Cek mobile (halaman /following)
  if (page.url().includes("/following")) {
    console.log("✅ Mode Mobile: halaman following terbuka");
    return "page";
  }

  console.log("❌ Gagal buka daftar following");
  return false;
}

// ======================
// AutoFollow
// ======================
async function autoFollow(page, username, maxFollow = 10, interval = 3000) {
  const mode = await openFollowing(page, username);
  if (!mode) return;

  let count = 0;

  while (count < maxFollow) {
    let clicked = false;

    // cari tombol pertama di viewport
    const btnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter(b => ["Ikuti", "Follow"].includes(b.innerText.trim()) && b.offsetParent !== null);
      return buttons.length > 0 ? buttons[0] : null;
    });

    if (btnHandle) {
      try {
        await btnHandle.click();
        clicked = true;
        console.log(`➕ Follow ke-${count + 1} (click)`);
      } catch {
        // fallback tap
        try {
          const box = await btnHandle.boundingBox();
          if (box) {
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            clicked = true;
            console.log(`➕ Follow ke-${count + 1} (tap)`);
          }
        } catch {}
      }
    }

    if (clicked) {
      count++;
      await delay(interval);

      // scroll sedikit supaya akun berikutnya naik
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

    // kalau tidak ada tombol → scroll agak jauh
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

  // Jalankan auto follow target dari daftar following
  await autoFollow(page, "zayrahijab", 5, 3000); // follow 5 orang, jeda 3 detik

  await browser.close();
})();
