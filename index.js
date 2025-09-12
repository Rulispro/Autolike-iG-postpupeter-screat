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
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

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

  // Ambil tombol "Diikuti" / "Following" lewat page.evaluate
  const buttonHandles = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns
      .filter(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null)
      .map(b => b.outerHTML); // simpan outerHTML untuk debug/log
  });

  console.log(`🔹 Ditemukan ${buttonHandles.length} tombol Diikuti`);

  for (let i = 0; i < buttonHandles.length; i++) {
    // Klik tombol lewat page.evaluate
    const clicked = await page.evaluate(idx => {
      const btns = Array.from(document.querySelectorAll("button"))
        .filter(b => /Diikuti|Following/i.test(b.innerText) && b.offsetParent !== null);
      if (btns[idx]) {
        btns[idx].scrollIntoView();
        btns[idx].click();
        return true;
      }
      return false;
    }, i);

    if (clicked) console.log(`🔘 Klik tombol Diikuti #${i + 1}`);
    else console.log(`⚠️ Tombol Diikuti #${i + 1} tidak ditemukan`);

    await delay(1000);

    // Debug popup
    const popupElements = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll("*")).map(el => ({
        tag: el.tagName,
        text: (el.innerText || '').trim(),
        className: el.className,
        html: el.outerHTML
      }));
    });

    console.log(`✅ Elemen popup:`);
    popupElements.forEach((el, idx) => {
      if(el.text.includes('Batal Mengikuti') || el.text.includes('Unfollow')) {
        console.log(`🟢 [${idx}] [${el.tag}] "${el.text}" class="${el.className}"`);
      }
    });

    // Klik tombol Batal Mengikuti / Unfollow
   // const unfollowClicked = await page.evaluate(() => {
    //  const dialog = document.querySelector('div[role="dialog"]');
    //  if (!dialog) return false;
     // const btn = Array.from(dialog.querySelectorAll("*"))
     ///   .find(el => /Batal Mengikuti|Unfollow/i.test(el.innerText));
  //  if (btn) {
    //    btn.click();
    //    return true;
   //   }
 //    return false;
//    });

   // if (unfollowClicked) console.log(`❌ Konfirmasi Unfollow diklik #${i + 1}`);
//    else console.log(`⚠️ Tombol konfirmasi Unfollow tidak ditemukan #${i + 1}`);
   
// Tunggu popup muncul sebentar
await delay(800);

// Cari dan klik tombol "Batal Mengikuti / Unfollow"
const unfollowClicked = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"))
    .filter(b => b.offsetParent !== null); // hanya tombol visible
  for (const btn of buttons) {
    if (/Batal Mengikuti|Unfollow/i.test(btn.innerText)) {
      btn.scrollIntoView();
      btn.click();
      return true;
    }
  }
  return false;
});

if (unfollowClicked) console.log(`❌ Konfirmasi Unfollow diklik #${i + 1}`);
else console.log(`⚠️ Tombol konfirmasi Unfollow tidak ditemukan #${i + 1}`);

// Debug: tampilkan semua tombol visible dengan text dan class
const debugButtons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("button"))
    .filter(b => b.offsetParent !== null)
    .map(b => ({ text: b.innerText.trim(), class: b.className }));
});
console.log("🔹 Tombol visible:", debugButtons);
  
    
    await delay(1000);
  }

  console.log("✅ Selesai proses unfollow visible buttons");
  await browser.close();
})();
