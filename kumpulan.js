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


////====FULLNYA ###
const puppeteer = require("puppeteer");
const fs = require("fs");

// =====================
// 1. Load Cookies
// =====================
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

// =====================
// 2. AutoLike
// =====================
//async function autoLike(page, maxLikes = 10, interval = 3000) {
 // console.log(`🚀 Mulai AutoLike, target ${maxLikes} like`);

//  const delay = ms => new Promise(r => setTimeout(r, ms));

//  for (let i = 0; i < maxLikes; i++) {
//    let success = false;
//
    // === Puppeteer click ===
  //  try {
   //   const btnHandle = await page.$("svg[aria-label='Suka'], svg[aria-label='Like']");
  //    if (btnHandle) {
    //    const button = await btnHandle.evaluateHandle(el => el.closest("button,[role=button]"));
    //    if (button) {
   //       await button.click();
     //     success = true;
   //       console.log(`❤️ (puppeteer.click) Klik like ke-${i + 1}`);
   //     }
   //   }
  //  } catch (e) {
 //     console.log("⚠️ Puppeteer click error:", e.message);
  //  }

    // === Touchscreen tap ===
  //  if (!success) {
    //  try {
    //    const btnHandle = await page.$("svg[aria-label='Suka'], svg[aria-label='Like']");
    //    if (btnHandle) {
    //      const box = await btnHandle.boundingBox();
    //      if (box) {
    //        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
     //       success = true;
    //        console.log(`❤️ (tap) Klik like ke-${i + 1}`);
    //      }
   //     }
  //   } catch (e) {
   //     console.log("⚠️ Tap error:", e.message);
   //   }
 //   }

    // === Kalau gagal total → scroll cari postingan baru ===
  //  if (!success) {
  //    console.log(`❌ Like ke-${i + 1} gagal, scroll cari postingan baru...`);
   //   await page.evaluate(() => window.scrollBy(0, 500));
  //    await delay(2000);
   //   continue;
 //   }

    // Delay antar klik
  ///  await delay(interval);

    // Scroll setelah klik supaya muncul postingan berikutnya
 //   await page.evaluate(() => window.scrollBy(0, 400));
 //   await delay(1500);
//  }
//console.log("✅ AutoLike selesai");
//}

// =====================

// =====================
// 3. Klik followers dengan 3 cara
// =====================
async function clickFollowersLink(page, username) {
  const selector = `a[href="/${username}/followers/"]`;
  const found = await page.$(selector);
  if (!found) {
    console.log("❌ Link followers tidak ketemu");
    return false;
  }

  // 1️⃣ Tap
  try {
    const box = await found.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      console.log("✅ Followers link ditekan (tap)");
      return true;
    }
  } catch {}

  // 2️⃣ dispatchEvent
  try {
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }
      return false;
    }, selector);
    if (ok) {
      console.log("✅ Followers link diklik (dispatchEvent)");
      return true;
    }
  } catch {}

  // 3️⃣ Klik biasa
  try {
    await found.click();
    console.log("✅ Followers link diklik (.click)");
    return true;
  } catch {}

  console.log("❌ Semua metode klik followers gagal");
  return false;
}

// =====================
// 4. AutoFollow Function (fix desktop & mobile)
// =====================
async function autoFollowFromTarget(page, username, total = 5, interval = 3000) {
  console.log(`🚀 Mulai AutoFollow dari @${username}, target ${total}`);

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "networkidle2",
  });
  console.log("✅ Halaman profil terbuka");

  const ok = await clickFollowersLink(page);
  if (!ok) return;

  // === Handle Desktop (dialog) vs Mobile (halaman baru) ===
  let isDialog = false;
  try {
    await page.waitForSelector('div[role="dialog"] ul, div._aano ul', { timeout: 8000 });
    console.log("✅ Mode Desktop: dialog followers muncul");
    isDialog = true;
  } catch {
    // cek kalau dia pindah ke halaman /followers/
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 }).catch(() => {});
    if (page.url().includes("/followers")) {
      console.log("✅ Mode Mobile: halaman followers terbuka");
    } else {
      console.log("❌ Gagal buka daftar followers");
      return;
    }
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;

  while (count < total) {
    let clicked = false;

    // === 1. Evaluate ===
    try {
      clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")]
          .find(b => ["Ikuti", "Follow"].includes(b.innerText.trim()) && b.offsetParent !== null);
        if (!btn) return false;
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.click();
        return true;
      });
      if (clicked) {
        count++;
        console.log(`➕ (evaluate) Follow ke-${count}`);
        await delay(interval);
        continue;
      }
    } catch {}

    // === 2. page.$x + click ===
    try {
      const btn = await page.$x("//button[text()='Follow' or text()='Ikuti']");
      if (btn.length > 0) {
        await btn[0].click();
        count++;
        console.log(`➕ (page.$) Follow ke-${count}`);
        await delay(interval);
        continue;
      }
    } catch {}

    // === 3. Tap ===
    try {
      const btn = await page.$x("//button[text()='Follow' or text()='Ikuti']");
      if (btn.length > 0) {
        const box = await btn[0].boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          count++;
          console.log(`➕ (tap) Follow ke-${count}`);
          await delay(interval);
          continue;
        }
      }
    } catch {}

    // === Scroll jika tidak ada tombol follow ===
    if (isDialog) {
      console.log("❌ Tidak ada tombol follow, scroll dialog...");
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul') || document.querySelector('div._aano ul');
        if (dialog) dialog.scrollBy(0, 200);
      });
    } else {
      console.log("❌ Tidak ada tombol follow, scroll halaman...");
      await page.evaluate(() => window.scrollBy(0, 500));
    }
    await delay(1000);
  }

  console.log(`✅ AutoFollow selesai, total follow: ${count}`);
}

// =====================
// 5. Main Flow
// =====================
(async () => {
  const browser = await puppeteer.launch({
    headless: true, // ganti false kalau mau lihat UI
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // === SET MOBILE MODE + BAHASA ===
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 412, height: 915 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  await page.setCookie(...cookies);

  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("✅ Login dengan cookies berhasil");
  console.log("URL sekarang:", page.url());
  await page.screenshot({ path: "debug.png", fullPage: true });

  // Jalankan AutoLike
  await autoLike(page, 10, 3000);

  // Jalankan AutoFollow (contoh target: instagram)
  await autoFollowFromTarget(page, "zayrahijab", 5, 3000);

  console.log("🎉 Semua tugas selesai");
  await browser.close();
})();


//// ====SCRIPT LIKE TERBARU===////

const puppeteer = require("puppeteer");
const fs = require("fs");


// Load cookies
const raw = fs.readFileSync("./cookies.json", "utf8");
const cookies = JSON.parse(raw);

// =====================
// AutoLike Function
// =====================
async function autoLike(page, maxLikes = 10, interval = 3000) {
  console.log(`🚀 Mulai AutoLike, target ${maxLikes} like`);

  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < maxLikes; i++) {

    const result = await page.evaluate(() => {
      const likes = Array.from(
        document.querySelectorAll('svg[aria-label="Like"]')
      );

      if (likes.length === 0) return false;

      const btn = likes[0];

      btn.scrollIntoView({ block: "center" });

      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      return true;
    });

    if (!result) {
      console.log(`❌ Like ke-${i + 1} gagal, scroll...`);
      await page.evaluate(() => window.scrollBy(0, 900));
      await delay(2500);
      i--;
      continue;
    }

    console.log(`❤️ Like ke-${i + 1} berhasil`);

    await delay(interval + Math.random() * 1500);
    await page.evaluate(() => window.scrollBy(0, 700));
    await delay(2000);
  }

  console.log("✅ AutoLike selesai");
}


(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  //MODE MOBILE
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
  );
  await page.setViewport({ width: 360, height: 687 });
  await page.setCookie(...cookies);
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  console.log("Current URL:", page.url());
  await page.waitForTimeout(4000);

  // DEBUG SVG
const count = await page.evaluate(() => {
  return document.querySelectorAll("svg").length;
});
console.log("Total SVG di halaman:", count);

const likeCount = await page.evaluate(() => {
  return document.querySelectorAll('svg[aria-label="Like"]').length;
});
console.log("Total Like button:", likeCount);
  const debug = await page.evaluate(() => {
  return Array.from(
    document.querySelectorAll('svg[aria-label="Suka"]')
  ).length;
});
console.log("Total tombol suka:", debug);


const isLogin = await page.evaluate(() => {
  return document.body.innerText.includes("Log in") === false;
});

console.log("Status login:", isLogin ? "LOGIN" : "BELUM LOGIN");
  
      const debugLike = await page.evaluate(() => {
  const articles = document.querySelectorAll("article");
  return articles.length;
});

console.log("Total article:", debugLike);
  
const debuging = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="button"]'))
    .map(b => b.getAttribute("aria-label"))
    .filter(Boolean);
});

console.log("DEBUG BUTTONS:", debug);

  await autoLike(page, 10, 3000);

  await browser.close();
})();
