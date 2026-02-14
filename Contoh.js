"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const XLSX = require("xlsx");   
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");

puppeteer.use(StealthPlugin())
//ACAK AKUN
function shuffleArray(arr) {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const rand = crypto.randomBytes(4).readUInt32BE(0);
    const j = rand % (i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}




//HELPER ISI CAPTION 
async function clearComposer(page) {
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(300);
}


async function typeCaptionFB(page,
  caption,
  delayMikir,
  delayKetikMin,
  delayKetikMax,
  pauseChance,
  pauseMin,
  pauseMax) {
  delayMikir = Number(delayMikir);
  delayKetikMin = Number(delayKetikMin);
  delayKetikMax = Number(delayKetikMax);
  pauseChance = Number(pauseChance);
  pauseMin = Number(pauseMin);
  pauseMax = Number(pauseMax);

  console.log("✍️ Ketik caption (FB stable)");

  // 1️⃣ Tunggu overlay loading hilang
  await page.waitForFunction(() => {
    return !(
      document.querySelector('[aria-label="Loading"]') ||
      document.querySelector('[aria-busy="true"]') ||
      document.querySelector('div[role="dialog"]')
    );
  }, { timeout: 30000 });

  // 2️⃣ Bangunin editor (WAJIB di FB)
  await page.keyboard.type(" ");
  await page.waitForTimeout(150);
  await page.keyboard.press("Backspace");

  await page.waitForTimeout(delayMikir);
  
  // 3️⃣ Ketik caption ala manusia
  for (const ch of caption) {

    const delayHuruf =
      Math.floor(Math.random() * (delayKetikMax - delayKetikMin + 1)) + delayKetikMin;

    await page.keyboard.type(ch, { delay: delayHuruf });

    // pause random dari XLSX
    if (Math.random() < pauseChance) {
      const pause =
        Math.floor(Math.random() * (pauseMax - pauseMin + 1)) + pauseMin;

      await page.waitForTimeout(pause);
    }
 }

  // 4️⃣ Commit React
  await page.keyboard.press("Space");
  await page.keyboard.press("Backspace");

  console.log("✅ Caption berhasil diketik captiontypeFB");

return { ok: true, method: "typeCaptionFB" };

  }


/// async function debugComposerAll(page) {
  ///console.log("\n🔎 DEBUG COMPOSER ALL ELEMENT");

 /// const data = await page.evaluate(() => {
   /// const results = [];

   /// document.querySelectorAll("div, textarea, span").forEach(el => {
      ///const r = el.getBoundingClientRect();
     /// if (r.width < 80 || r.height < 40) return;

     /// const attrs = el.getAttributeNames();

      ///const isCandidate =
       /// el.isContentEditable ||
       /// el.getAttribute("contenteditable") === "true" ||
       /// el.tagName === "TEXTAREA" ||
       //// el.getAttribute("role") === "textbox" ||
       //// el.getAttribute("role") === "combobox" ||
       /// el.getAttribute("data-mcomponent") === "ServerTextArea" ||
       /// attrs.some(a => a.includes("aria"));

      ///if (!isCandidate) return;

      ///results.push({
       /// tag: el.tagName,
        ///role: el.getAttribute("role"),
       /// aria: el.getAttribute("aria-label"),
       /// data: el.getAttribute("data-mcomponent"),
        /// contenteditable: el.getAttribute("contenteditable"),
        ///class: (el.className || "").toString().slice(0, 60),
       /// textPreview: (el.innerText || el.value || "").slice(0, 30)
      ///});
    ///});

   //) return results;
 /// });

//) console.log("🧪 COMPOSER ALL:", JSON.stringify(data, null, 2));
///}

//Validasinya 
async function validateCaption(page, caption) {
  return await page.evaluate(text => {
    const el =
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea');

    if (!el) return false;

    const domVal =
      el.textContent ||
      el.innerText ||
      el.value ||
      "";

    // fallback React internal (FB pakai data-text)
    const dataText = el.getAttribute("data-text") || "";

    return (
      domVal.includes(text.slice(0, 3)) ||
      dataText.includes(text.slice(0, 3))
    );
  }, caption);
}


//ISI CAPTION type manusia tahan update 


 async function typeCaptionStable(page, caption) {
  let typed = false;

  try {
    // 1️⃣ AKTIFKAN COMPOSER
    await page.evaluate(() => {
      const candidates = [
        '[role="textbox"]',
        '[role="combobox"]',
        'textarea',
        'div[contenteditable="true"]',
        '[aria-label*="Tulis sesuatu"]',
        '[aria-label*="Write something"]'
      ];

      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          return true;
        }
      }
      return false;
    });

    await page.waitForTimeout(1500);

    // 2️⃣ PASTIKAN FOCUS
    const focused = await page.evaluate(() => {
      const els = document.querySelectorAll(
        'div[contenteditable="true"], textarea'
      );
      for (const el of els) {
        el.click();
        el.focus();
        if (document.activeElement === el) return true;
      }
      return false;
    });

    if (!focused) {
      return { ok: false, typed: false, step: "focus_failed" };
    }

    // 3️⃣ TYPE CAPTION
    typed = true;
    for (const char of caption) {
      await page.keyboard.type(char, {
        delay: 80 + Math.random() * 120
      });

      if (Math.random() < 0.05) {
        await page.waitForTimeout(300 + Math.random() * 600);
      }
    }

    await page.waitForTimeout(800);

    // 4️⃣ COMMIT REACT
    await page.keyboard.press("Space");
    await page.keyboard.press("Backspace");

    // 5️⃣ VALIDASI
    const ok = await validateCaption(page, caption);

    if (ok) {
      return { ok: true, typed: true, step: "stable_ok" };
    }

    console.log("⚠️ Stable ngetik tapi tidak tervalidasi");
    return { ok: false, typed: true, step: "validation_failed" };

  } catch (err) {
    console.log("❌ typeCaptionStable exception:", err.message);
    return { ok: false, typed, step: "exception", error: err.message };
  }
}
   
  



//isi caption klik placeholder 
async function activateComposerAndFillCaption(page, caption) {
  return await page.evaluate((text) => {
    const placeholderKeywords = [
      "write something",
      "tulis sesuatu",
      "buat postingan publik",
      "create a public post",
      "kirim postingan buat persetujuan admin",
      "submit a post for admin"
    ];

    // ===============================
    // 1️⃣ CLICK PLACEHOLDER (DOM BUTTON)
    // ===============================
    const btn = [...document.querySelectorAll("div[role='button']")]
      .find(el => {
        const t = (el.innerText || "").toLowerCase();
        return placeholderKeywords.some(k => t.includes(k));
      });

    if (btn) {
      ["mousedown", "mouseup", "click"].forEach(type =>
        btn.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window
          })
        )
      );
    }

    // ===============================
    // 2️⃣ FIND & FILL TEXTBOX
    // ===============================
    const selectors = [
  "div[contenteditable='true'][role='textbox']",
  "div[contenteditable='true']",
  "textarea"
];
    for (const s of selectors) {
      const tb = document.querySelector(s);
      if (!tb) continue;

      tb.focus();

      // clear dulu (penting buat React)
      if ("value" in tb) {
        tb.value = "";
      } else {
        tb.innerText = "";
        tb.textContent = "";
      }

      // isi caption
      if ("value" in tb) {
        tb.value = text;
        tb.dispatchEvent(new Event("input", { bubbles: true }));
        tb.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        tb.innerText = text;
        tb.dispatchEvent(new InputEvent("input", { bubbles: true }));
        tb.dispatchEvent(new Event("change", { bubbles: true }));
      }

      return {
        ok: true,
        step: "activate+fill",
        selector: s
      };
    }

    return {
      ok: false,
      step: "textbox_not_found"
    };
  }, caption);
}


//caption human like 
async function typeByExecCommand(page, caption) {
  await page.evaluate(text => {
    const el = document.querySelector(
  'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea'
);
  if (!el) return;

    el.focus();
    document.execCommand("insertText", false, text);
  }, caption);
}

async function typeByInputEvents(page, caption) {
  const selector = 'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea'
  

  // 3️⃣ Fokus editor & set caret di akhir
  const focused = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.focus();
    el.click(); // pastikan aktif
    const selObj = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selObj.removeAllRanges();
    selObj.addRange(range);
    return document.activeElement === el;
  }, selector);

  if (!focused) {
    console.log("❌ Editor tidak bisa fokus");
    return false;
  }

  // 4️⃣ Masukkan teks per karakter (human-like)
  for (const char of caption) {
    await page.evaluate((ch, sel) => {
      const el = document.querySelector(sel);
      if (!el) return;

      // INSERT TEXT via execCommand
      document.execCommand("insertText", false, ch);

      // FIRE beforeinput & input event
      const beforeEvt = new InputEvent("beforeinput", { inputType: "insertText", data: ch, bubbles: true, cancelable: true });
      const inputEvt = new InputEvent("input", { inputType: "insertText", data: ch, bubbles: true });

      el.dispatchEvent(beforeEvt);
      el.dispatchEvent(inputEvt);
    }, char, selector);

    // delay human-like
    await page.waitForTimeout(50 + Math.random() * 80);
  }

  // 5️⃣ Commit terakhir (Space + Backspace) supaya React detect perubahan
  await page.keyboard.press("Space");
  await page.keyboard.press("Backspace");

  // 6️⃣ Validasi isi caption
  const ok = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    return (el.innerText && el.innerText.trim().length > 0);
  }, selector);

  if (ok) {
    console.log("✅ Caption berhasil diisi (Ultimate BeforeInput)");
  } else {
    console.log("❌ Caption gagal masuk");
  }

  return ok;
}
async function typeCaptionFinal(page, caption) {
  console.log("✍️ Isi caption via InputEvent FINAL (SINGLE FUNC)");

  const editor = await page.waitForSelector(
    'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea',
    { timeout: 10000, visible: true }
  );

  if (!editor) throw new Error("❌ Editor FB tidak ditemukan");

  await editor.click({ delay: 50 });
  await page.waitForTimeout(300);

  await page.evaluate((el, text) => {
    el.focus();

    // Clear editor
    if (el.innerHTML !== undefined) el.innerHTML = "";
    if (el.value !== undefined) el.value = "";

    // Set caret di akhir
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    // Masukkan teks per karakter
    for (const ch of text) {
      el.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: ch
      }));
      document.execCommand("insertText", false, ch); // optional tambahan biar React deteksi
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: ch
      }));
    }
  }, editor, caption);

  // Delay sebentar biar React update
  await page.waitForTimeout(300);

  // Validasi
  const ok = await page.evaluate(el => {
    return (el.innerText && el.innerText.trim().length > 0) ||
           (el.value && el.value.trim().length > 0);
  }, editor);

  if (ok) console.log("✅ Caption BERHASIL diisi (FINAL)");
  else console.log("❌ Caption gagal masuk");

  return ok;
}


async function typeByForceReact(page, caption) {
  const selector =
    'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea';

  // 1️⃣ FOKUS COMPOSER
  const focused = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    el.focus();
    return document.activeElement === el;
  }, selector);

  if (!focused) {
    console.log("❌ Composer tidak fokus");
    return { ok: false, step: "focus_failed" };
  }

  await page.waitForTimeout(300);

  // 2️⃣ TYPE HUMAN-LIKE (ACAK)
  for (const char of caption) {
    const delay = 80 + Math.random() * 120; // 80–200 ms
    await page.keyboard.type(char, { delay });

    if (Math.random() < 0.05) {
      await page.waitForTimeout(300 + Math.random() * 700);
    }
  }

  // 3️⃣ COMMIT REACT
  await page.keyboard.press("Space");
  await page.keyboard.press("Backspace");

  // 4️⃣ VALIDASI
  await page.waitForTimeout(800);
  const ok = await validateCaption(page, caption);
  if (ok) {
    return { ok: true, step: "typed_human" };
  }

  // 5️⃣ FALLBACK: FORCE REACT (KALAU GAGAL)
  console.log("⚠️ Human typing gagal, pakai force React");

  const forced = await page.evaluate((text, sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;

    el.focus();
    el.innerText = text;

    ["input", "change"].forEach(evt =>
      el.dispatchEvent(new Event(evt, { bubbles: true }))
    );

    return true;
  }, caption, selector);

  return forced
    ? { ok: true, step: "forced_react" }
    : { ok: false, step: "all_failed" };
}

async function typeByExecCommand(page, caption) {
  await page.evaluate(text => {
    document.execCommand("insertText", false, text);
  }, caption);
}

async function typeByKeyboard(page, caption) {

  // THINK BEFORE TYPE
  await page.waitForTimeout(800 + Math.random() * 1200);

  // WAKE EDITOR
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("Backspace");

  await page.waitForTimeout(300 + Math.random() * 400);

  // TYPE PER CHAR (biar bisa pause random)
  for (const char of caption) {

    await page.keyboard.type(char, {
      delay: 80 + Math.random() * 70
    });

    // 10% chance pause mikir
    if (Math.random() < 0.1) {
      await page.waitForTimeout(400 + Math.random() * 900);
    }
  }

}


//async function typeByInputEvent(page, caption) {
 // await page.evaluate(text => {
     //const el = document.querySelector(
   //'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea'
  //);
  //if (!el) return false;

  //  el.focus();

   // el.dispatchEvent(new InputEvent("beforeinput", {
      //inputType: "insertText",
    //data: text,
     // bubbles: true,
      //cancelable: true
    //}));

   // el.textContent = text;

   //el.dispatchEvent(new InputEvent("input", {
      //inputType: "insertText",
      //data: text,
     // bubbles: true
  //  }));

   // return true;
  //}, caption);
//}


//isi caption tambahan cara 
async function typeCaptionUltimate(page,
  caption,
  delayMikir,
  delayKetikMin,
  delayKetikMax,
  pauseChance,
  pauseMin,
  pauseMax) {
  console.log("🧠 typeCaptionUltimate start");
  
let fbResult;

try {
 fbResult = await typeCaptionFB(
  page,
  caption,
  delayMikir,
  delayKetikMin,
  delayKetikMax,
  pauseChance,
  pauseMin,
  pauseMax
);
} catch (e) {
  console.log("⚠️ typeCaptionFB error → lanjut fallback");
}

if (fbResult?.ok) {
  console.log("✅ Caption OK via typeCaptionFB");
  return fbResult; // ⛔ STOP HANYA JIKA SUKSES
}

// ❗ JANGAN return di sini
console.log("❌ typeCaptionFB gagal → lanjut metode berikutnya");
      
   
 const stable = await typeCaptionStable(page, caption);

if (stable?.ok) {
 console.log("✅ Caption OK via Stable");
  return stable;
}

if (stable?.typed) {
 console.log("⚠️ Stable sudah mengetik → STOP (hindari dobel)");
  return { ok: true, method: "StableTyped" };
 }

// ⬇️ HANYA MASUK SINI JIKA STABLE GAGAL TANPA NGETIK
console.log("🧠 Stable gagal tanpa ngetik → lanjut metode lain");
  
console.log("🧠 Stable gagal → Combo helper");
 
console.log("🧠 Activate composer + fill caption (combo)");
 const comboResult = await activateComposerAndFillCaption(page, caption);
 console.log("COMBO:", comboResult);

  await page.waitForTimeout(2000);

  if (comboResult?.ok) {
   console.log("✅ Caption OK via combo helper (trust React)");
    return;
 }
 console.log("🧠 Try typeCaptionSafe (legacy)");
  await clearComposer(page);
  
    try {
      await typeCaptionSafe(page, caption);
      await page.waitForTimeout(400);

    if (await validateCaption(page, caption)) {
       console.log("✅ typeCaptionSafe OK");
      return;
      }
    } catch (e) {
     console.log("⚠️ typeCaptionSafe gagal, lanjut fallback");
  } 

  const methods = [
      { name: "Keyboard", fn: typeByKeyboard },
      { name: "ExecCommand", fn: typeByExecCommand },
      { name: "InputEvent", fn: typeByInputEvents },
      {name: "typeCaptionFinal", fn: typeCaptionFinal },
      { name: "ForceReact", fn: typeByForceReact }
  ];

for (const m of methods) {
    console.log(`✍️ Try ${m.name}...`);
  await clearComposer(page); // ⬅️ INI KUNCI ANTI DOBEL
   try {
      await m.fn(page, caption);
    } catch (err) {
     console.log(`⚠️ ${m.name} ERROR → lanjut fallback`);
    console.log("↪", err.message);
     continue; // ⬅️ INI KUNCI NYA
   }

  await page.waitForTimeout(500);

    //commit React
   await page.keyboard.press("Space");
   await page.keyboard.press("Backspace");

  if (await validateCaption(page, caption)) {
      console.log(`✅ ${m.name} OK`);
      return;
   }

  console.log(`❌ ${m.name} tidak valid → lanjut`);
}

  console.log("⚠️ Semua metode caption gagal → lanjut TANPA caption");
return { ok: false, reason: "caption_blocked" };

}

//Helper isi caption status 
async function typeCaptionSafe(page, caption) {
  const selector =
    'div[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea';

  // ===============================
  // 1️⃣ WAKE UP REACT COMPOSER
  // ===============================
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(300);

  // ===============================
  // 2️⃣ PASTIKAN FOCUS KE TEXTBOX
  // ===============================
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (el) el.focus();
  }, selector);

  await page.waitForTimeout(200);

  // ===============================
  // 3️⃣ INPUT PALING AMAN: KEYBOARD
  // ===============================
  await page.keyboard.type(caption, { delay: 90 });
  await page.waitForTimeout(600);

  // ===============================
  // 4️⃣ VALIDASI REACT (BUKAN DOM PALSU)
  // ===============================
  const ok = await page.evaluate((sel, text) => {
    const el = document.querySelector(sel);
    if (!el) return false;

    const value = el.textContent || el.innerText || "";
    return value.includes(text.slice(0, 5));
  }, selector, caption);

if (!ok) {
  console.log("⚠️ React validation skipped (STATUS mode)");
  return;
}

  console.log("✅ Caption TERISI (React acknowledged)");
}

//FUNGSI DELAY DARI XLSX 
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//PARSE TANGGAL///
function parseTanggalXLSX(tgl) {
  if (!tgl) return null;

  // format: M/D/YY atau MM/DD/YY
  const [m, d, y] = tgl.split("/");

  const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);

  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

// ====== RUN LIKELINKPOST (AMBIL DARI XLSX) ======
async function runLikeLinkPosts(page, row) {
  console.log("\n🧪 runLikeLinkPosts row:", row);

  const account = row.account;
  const total = Number(row.total) || 1;
  const delayMin = Number(row.delay_min) || 4000;
  const delayMax = Number(row.delay_max) || 8000;

  // ===== PARSE LINK GROUP =====
  const groups = String(row.link_group || "")
    .split(",")
    .map(g => g.replace(/[\s\r\n]+/g, "").trim())
    .filter(Boolean);

  if (!account || groups.length === 0) {
    console.log("⚠️ Row XLSX tidak lengkap, skip");
    return;
  }

  console.log(`👤 Account: ${account}`);
  console.log(`🔢 Total Like per Group: ${total}`);
  console.log(`⏱ Delay Range: ${delayMin}-${delayMax} ms`);
  console.log(`🔗 Total Group: ${groups.length}`);

  for (let i = 0; i < groups.length; i++) {
    let groupUrl = groups[i];

    if (!groupUrl.startsWith("http")) {
      groupUrl = "https://m.facebook.com/" + groupUrl.replace(/^\/+/, "");
    }

    console.log(`\n📌 Buka Group ${i + 1}/${groups.length}`);
    console.log("➡️", groupUrl);

    await linkPost(page, groupUrl, total, delayMin, delayMax);
  }
    }
   // ===== FUNGSI LIKE LINK POSTINGAN =====
async function linkPost(page, groupUrl, total, delayMin, delayMax) {
  try {
    console.log("🚀 Buka halaman target");
    await page.goto(groupUrl, { waitUntil: "networkidle2" });
    await page.waitForTimeout(4000);

    let clicked = 0;

    while (clicked < total) {

      const liked = await page.evaluate(() => {

        function humanClick(el) {
          el.scrollIntoView({ block: "center" });
          ["pointerdown","touchstart","mousedown","mouseup","touchend","click"]
            .forEach(ev =>
              el.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }))
            );
        }

        const btn = [...document.querySelectorAll('div[role="button"]')]
          .find(el => {
            const label = (el.getAttribute("aria-label") || "").toLowerCase();
            return label.includes("like") || label.includes("suka");
          });

        if (!btn) return false;

        humanClick(btn);
        return true;
      });

      if (!liked) {
        console.log("⚠️ Tombol Like tidak ditemukan, scroll...");
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(3000);
        continue;
      }

      clicked++;
      console.log(`👍 Like ke-${clicked} dari ${total}`);

      const delay =
        Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

      console.log(`⏱ Delay ${delay} ms`);
      await page.waitForTimeout(delay);

      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.5)
      );
    }

    console.log(`🎉 Selesai Like ${clicked} postingan`);
    return clicked;

  } catch (err) {
    console.error("❌ Error linkPost:", err.message);
    return 0;
  }
}



//FUNGSI LIKELINKGROUP
async function runLikeLinkGroups(page, row) {
  console.log("\n🧪 runLikeLinkGroups row:", row);

  const account = row.account;
  const total = Number(row.total || 0);
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);

  // ===== VALIDASI DATA =====
  if (!account || total <= 0) {
    console.log("⚠️ Data XLSX tidak lengkap (account/total), skip");
    return;
  }

// ===== PARSE LIST GRUP =====
const groups = String(row.link_group || "")
  .split(",")
  .map(g => g.replace(/[\s\r\n]+/g, "").trim())
  .filter(Boolean);

if (groups.length === 0) {
  console.log("⚠️ Tidak ada link_group, skip");
  return;
}


  console.log(`🧠 Account: ${account}`);
  console.log(`🔢 Total Like per Grup: ${total}`);
  console.log(`⏱️ Delay: ${delayMin} - ${delayMax}`);
  console.log(`🔗 Jumlah Grup: ${groups.length}`);

  // ===== LOOP SEMUA GRUP =====
  for (let i = 0; i < groups.length; i++) {

    let groupUrl = groups[i];

    // ✅ Perbaiki URL kalau belum lengkap
    if (!groupUrl.startsWith("http")) {
      groupUrl = "https://m.facebook.com/" + groupUrl.replace(/^\/+/, "");
    }

    if (!groupUrl.includes("/groups/")) {
      console.log("❌ URL bukan grup, skip:", groupUrl);
      continue;
    }

    console.log(`\n📌 [${account}] Grup ${i + 1}/${groups.length}`);
    console.log("➡️", groupUrl);

    // ===== BUKA GRUP =====
    await page.goto(groupUrl, { waitUntil: "networkidle2" });
    await page.waitForTimeout(4000);

    let clicked = 0;

    // ===== LOOP LIKE =====
    while (clicked < total) {

      const liked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('div[role="button"]')]
          .find(el => {
            const label = (el.getAttribute("aria-label") || "").toLowerCase();
            return (
              label.includes("like") ||
              label.includes("suka")
            );
          });

        if (!btn) return false;

        btn.scrollIntoView({ block: "center" });
        btn.click();
        return true;
      });

      if (!liked) {
        console.log("🔄 Tidak ada tombol Like, scroll...");
        await page.evaluate(() =>
          window.scrollBy(0, window.innerHeight * 0.8)
        );
        await page.waitForTimeout(2000);
        continue;
      }

      clicked++;
      console.log(`👍 Like ke-${clicked} dari ${total}`);

      const delay =
        Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

      console.log(`⏱️ Delay ${delay} ms`);
      await page.waitForTimeout(delay);

      // Scroll sedikit biar muncul post baru
      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.6)
      );

      await page.waitForTimeout(2000);
    }

    console.log(`✅ Selesai grup ini (${clicked} like)`);
  }

  console.log("🎉 Semua grup selesai diproses");
}


//FUNGSI UNDFRIEND 
async function runUndfriends(page, row) {
  console.log("🧪 ROW RAW:", row);
  console.log("🧪 Object keys:", Object.keys(row));
 
  for (const k in row) {
  console.log("FIELD:", `[${k}]`);
  }
  
  console.log(`\n📝 Mulai addUndftiend → ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Mulai addUndftiend→ ${account}`);
  const total = String(row.total || "").trim();
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);
  console.log("Delay XLSX:", delayMin, delayMax);
  console.log("TOTAL:", row.total);
  
  
  
  
  if (!total) {
  console.log("⚠️ total kosong, skip");
  return;
  }


  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  console.log("BUKA FACEBOOK");
  await delay(3000);

// contoh daftar target
  const clicked = await page.evaluate(() => {
  // 🔍 cari tombol profile (ID + EN)
  const btn = [...document.querySelectorAll('div[role="button"]')]
    .find(el => {
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      return label.includes("profil") || label.includes("profile");
    });

  if (!btn) return false;

  // 👁️ pastikan terlihat
  btn.scrollIntoView({ block: "center", behavior: "smooth" });

  // 🖱️ trigger React / FB event chain
  const events = [
    new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
    new TouchEvent("touchend", { bubbles: true, cancelable: true }),
    new PointerEvent("pointerdown", { bubbles: true }),
    new PointerEvent("pointerup", { bubbles: true }),
    new MouseEvent("mousedown", { bubbles: true }),
    new MouseEvent("mouseup", { bubbles: true }),
    new MouseEvent("click", { bubbles: true })
  ];

  events.forEach(e => btn.dispatchEvent(e));
  return true;
});

console.log("👤 Klik profile:", clicked);

  await page.waitForTimeout(1000);

  // 2️⃣ tap span FOLLOWING (INLINE, span only)
const ok = await page.evaluate(() => {
  const spans = [...document.querySelectorAll("span")];

  const target = spans.find(s => {
    const t = (s.innerText || "").trim().toLowerCase();

    // ⛔ skip span angka
    if (!t || /^\d+$/.test(t)) return false;

    // ✅ hanya teks following
    return t === "following" || t === "mengikuti";
  });

  if (!target) return false;

  target.scrollIntoView({ block: "center", behavior: "smooth" });

  const events = [
    new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
    new TouchEvent("touchend", { bubbles: true, cancelable: true }),
    new PointerEvent("pointerdown", { bubbles: true }),
    new PointerEvent("pointerup", { bubbles: true }),
    new MouseEvent("mousedown", { bubbles: true }),
    new MouseEvent("mouseup", { bubbles: true }),
    new MouseEvent("click", { bubbles: true })
  ];

  events.forEach(e => target.dispatchEvent(e));

  return true;
});

if (!ok) {
  console.log("❌ span following / mengikuti tidak ditemukan");
} else {
  console.log("📂 Halaman following dibuka (via tap span)");
  await page.waitForTimeout(2000);
}
await unfriend(page, total, delayMin, delayMax);
}

async function unfriend(page, total, delayMin, delayMax) {
  try {
    const LIMIT = Number(total) || 1;
    let done = 0;

    await page.waitForTimeout(3000);

    while (done < LIMIT) {

      // 1️⃣ Klik tab Friends
      const step1 = await page.evaluate(() => {
        const tab = [...document.querySelectorAll('[role="tab"]')]
          .find(el => {
            const label = (el.getAttribute("aria-label") || "").toLowerCase();
            return label.includes("friends") || label.includes("teman");
          });

        if (!tab) return false;
        tab.click();
        return true;
      });

      if (!step1) {
        console.log("⚠️ Friends tab tidak ditemukan");
        break;
      }

      await page.waitForTimeout(2000);

      // 2️⃣ Klik tombol Friend settings (titik tiga)
      const step2 = await page.evaluate(() => {
        const menu = [...document.querySelectorAll('[role="button"]')]
          .find(el => {
            const label = (el.getAttribute("aria-label") || "").toLowerCase();
            return label.includes("friend settings") || 
                   label.includes("pengaturan teman");
          });

        if (!menu) return false;
        menu.click();
        return true;
      });

      if (!step2) {
        console.log("⚠️ Friend settings tidak muncul");
        break;
      }

      await page.waitForTimeout(2000);

      // 3️⃣ Klik Unfriend
      const step3 = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("span")]
          .find(el => {
            const t = (el.innerText || "").toLowerCase();
            return t.includes("unfriend") ||
                   t.includes("hapus pertemanan") ||
                   t.includes("batalkan pertemanan");
          });

        if (!btn) return false;
        btn.click();
        return true;
      });

      if (!step3) {
        console.log("❌ Tombol Unfriend tidak ditemukan");
        break;
      }

      await page.waitForTimeout(2000);

      // 4️⃣ Klik konfirmasi Unfriend (popup)
      await page.evaluate(() => {
        const confirmBtn = [...document.querySelectorAll('[role="button"] span')]
          .find(el => {
            const t = (el.innerText || "").toLowerCase();
            return t === "unfriend" ||
                   t === "hapus pertemanan";
          });

        if (confirmBtn) confirmBtn.click();
      });

      done++;
      console.log(`🤗 Unfriend ke-${done}`);

      const delay = randomDelay(delayMin, delayMax);
      console.log(`⏱️ Delay ${delay} ms`);
      await page.waitForTimeout(delay);

      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.7)
      );

      await page.waitForTimeout(2000);
    }

    console.log(`🎯 Total Unfriend selesai: ${done}`);
    return done;

  } catch (err) {
    console.error("❌ Error unfriend:", err.message);
    return 0;
  }
}

//FUNGSI addFriendFollowing
async function runAddFriendFollowings(page, row) {
  console.log("🧪 ROW RAW:", row);
  console.log("🧪 Object keys:", Object.keys(row));
 console.log("🧪 LINK DIRECT:", row.link_targetUsername);
  
  for (const k in row) {
  console.log("FIELD:", `[${k}]`);
  }
  
  console.log(`\n📝 Mulai addFriendFollowing → ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Mulai addFriendFollowing → ${account}`);
  const total = String(row.total || "").trim();
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);
  console.log("Delay XLSX:", delayMin, delayMax);
  console.log("TOTAL:", row.total);
  const linkTargetUsernameUrl = String(row.link_targetUsername || "").trim();
  console.log("LINK:", row.link_targetUsername);
  
  console.log("🧪 LINK DIRECT:", row.link_targetUsername);
console.log("🧪 LINK LOWER:", row.link_targetUsername);

  
  
  if (!total || !linkTargetUsernameUrl) {
  console.log("⚠️ linkTargetUsername kosong, skip");
  return;
  }


  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  
  await delay(3000);
// bikin array target (kalau cuma 1 link tetap aman)
const targets = [linkTargetUsernameUrl];

for (const profile of targets) {
  // 1️⃣ buka profil target
  await page.goto(profile, { waitUntil: "networkidle2" });
  console.log("👤 Profil dibuka:", profile);

  await page.waitForTimeout(3000);

  // 2️⃣ tap span FOLLOWING (INLINE, span only)
const ok = await page.evaluate(() => {
  const spans = [...document.querySelectorAll("span")];

  const target = spans.find(s => {
    const t = (s.innerText || "").trim().toLowerCase();

    // ⛔ skip span angka
    if (!t || /^\d+$/.test(t)) return false;

    // ✅ hanya teks following
    return t === "following" || t === "mengikuti";
  });

  if (!target) return false;

  target.scrollIntoView({ block: "center", behavior: "smooth" });

  const events = [
    new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
    new TouchEvent("touchend", { bubbles: true, cancelable: true }),
    new PointerEvent("pointerdown", { bubbles: true }),
    new PointerEvent("pointerup", { bubbles: true }),
    new MouseEvent("mousedown", { bubbles: true }),
    new MouseEvent("mouseup", { bubbles: true }),
    new MouseEvent("click", { bubbles: true })
  ];

  events.forEach(e => target.dispatchEvent(e));

  return true;
});

if (!ok) {
  console.log("❌ span following / mengikuti tidak ditemukan");
  continue;
}

console.log("📂 Halaman following dibuka (via tap span)");

// tunggu halaman followers load
  await page.waitForTimeout(2000);
}
// setelah buka following → baru add friend
await addFriendByUsernameFollowing(page,total,delayMin, delayMax);

  // FUNGSI ADDFRIEND by target username following
async function addFriendByUsernameFollowing(page, total,delayMin, delayMax) {
  try {
    const LIMIT = Number(total) || 0;

    if (LIMIT <= 0) {
      console.log("⚠️ LIMIT tidak valid:", total);
      return 0;
    }

    console.log(`🚀 Mulai add friend (followers list), target: ${LIMIT}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    let clicked = 0;

    while (clicked < LIMIT) {
      const found = await page.evaluate(() => {
        function humanClick(el) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          ["pointerdown","touchstart","mousedown","mouseup","touchend","click"]
            .forEach(type =>
              el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
            );
        }

        const buttons = [...document.querySelectorAll('div[role="button"]')]
          .filter(btn => {
            const text = (btn.innerText || "").toLowerCase();
            const aria = (btn.getAttribute("aria-label") || "").toLowerCase();

            return (
              text.includes("add friend") ||
              text.includes("tambah teman") ||
              text.includes("tambahkan teman") ||
              aria.startsWith("send a friend request") ||
              aria.startsWith("kirim permintaan pertemanan")
            );
          });

        // skip tombol Add Friend di profil
        const listButtons = buttons.slice(1);

        for (const btn of listButtons) {
          if (btn.dataset.clicked) continue;

          btn.dataset.clicked = "true";
          humanClick(btn);
          return true;
        }

        return false;
      });

      if (!found) {
        console.log("⚠️ Tidak ada Add Friend lagi di followers");
        break;
      }

      clicked++;
      console.log(`✅ Klik Add Friend ke-${clicked}`);

    const delay = randomDelay(delayMin, delayMax);
    console.log(`⏱️ Delay ${delay} ms sebelum klik berikutnya`);
    await page.waitForTimeout(delay);
      
      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.8)
      );
      await page.waitForTimeout(3000);
    }

    console.log(`🎯 Selesai. Total Add Friend: ${clicked}`);
    return clicked;

  } catch (err) {
    console.error("❌ Error addFriendByUsernameFollowers:", err.message);
    return 0;
  }
}

}

//FUNGSI addFriendFriendlist 
async function runAddFriendFriends(page, row) {
  console.log("🧪 ROW RAW:", row);
  console.log("🧪 Object keys:", Object.keys(row));
 console.log("🧪 LINK DIRECT:", row.link_targetUsername);
  
  for (const k in row) {
  console.log("FIELD:", `[${k}]`);
  }
  
  console.log(`\n📝 Mulai addFriendFriends→ ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Mulai addFriendFriends → ${account}`);
  const total = String(row.total || "").trim();
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);
  console.log("Delay XLSX:", delayMin, delayMax);
  console.log("TOTAL:", row.total);
  const linkTargetUsernameUrl = String(row.link_targetUsername || "").trim();
  console.log("LINK:", row.link_targetUsername);
  
  console.log("🧪 LINK DIRECT:", row.link_targetUsername);
console.log("🧪 LINK LOWER:", row.link_targetUsername);

  
  
  if (!total || !linkTargetUsernameUrl) {
  console.log("⚠️ linkTargetUsername kosong, skip");
  return;
  }


  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  
  await delay(3000);
// bikin array target (kalau cuma 1 link tetap aman)
const targets = [linkTargetUsernameUrl];
for (const profile of targets) {
  // 1️⃣ buka profil target
  await page.goto(profile, { waitUntil: "networkidle2" });
  console.log("👤 Profil dibuka:", profile);

  await page.waitForTimeout(3000);

  // 2️⃣ tap span FOLLOWING (INLINE, span only)
const ok = await page.evaluate(() => {
  const spans = [...document.querySelectorAll("span")];

  const target = spans.find(s => {
    const t = (s.innerText || "").trim().toLowerCase();

    // ⛔ skip span angka
    if (!t || /^\d+$/.test(t)) return false;

    // ✅ hanya teks following
    return t === "following" || t === "mengikuti";
  });

  if (!target) return false;

  target.scrollIntoView({ block: "center", behavior: "smooth" });

  const events = [
    new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
    new TouchEvent("touchend", { bubbles: true, cancelable: true }),
    new PointerEvent("pointerdown", { bubbles: true }),
    new PointerEvent("pointerup", { bubbles: true }),
    new MouseEvent("mousedown", { bubbles: true }),
    new MouseEvent("mouseup", { bubbles: true }),
    new MouseEvent("click", { bubbles: true })
  ];

  events.forEach(e => target.dispatchEvent(e));

  return true;
});

if (!ok) {
  console.log("❌ span following / mengikuti tidak ditemukan");
  continue;
}

console.log("📂 Halaman following dibuka (via tap span)");

await page.waitForTimeout(2000);
  // buka friends list
const okFriends = await openFriendsList(page);
if(okFriends){
  // mulai add friend
  await addFriendFromList(page, total, delayMin, delayMax);
}
  //buka friendslist 
  async function openFriendsList(page) {
  try {
    const ok = await page.evaluate(() => {
      const spans = [...document.querySelectorAll("span")];

      const target = spans.find(s => {
        const t = (s.innerText || "").trim().toLowerCase();

        // ⛔ skip kosong & angka
        if (!t || /^\d+$/.test(t)) return false;

        // ✅ khusus FRIENDS
        return t === "friends" || t === "teman";
      });

      if (!target) return false;

      target.scrollIntoView({ block: "center", behavior: "smooth" });

      const events = [
        new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
        new TouchEvent("touchend", { bubbles: true, cancelable: true }),
        new PointerEvent("pointerdown", { bubbles: true }),
        new PointerEvent("pointerup", { bubbles: true }),
        new MouseEvent("mousedown", { bubbles: true }),
        new MouseEvent("mouseup", { bubbles: true }),
        new MouseEvent("click", { bubbles: true })
      ];

      events.forEach(e => target.dispatchEvent(e));

      return true;
    });

    if (!ok) {
      console.log("❌ span Friends / Teman tidak ditemukan");
      return false;
    }

    console.log("📂 Halaman Friends dibuka (via tap span)");
    await page.waitForTimeout(2000);
    return true;

  } catch (err) {
    console.log("⚠️ Terjadi error saat membuka halaman Friends:", err);
    return false;
  }
}

await page.waitForTimeout(2000);
// setelah buka friends→ baru add friend
 // FUNGSI ADDFRIEND by target username followers
async function addFriendFromList(page, total,delayMin, delayMax) {
  try {
    const LIMIT = Number(total) || 0;

    if (LIMIT <= 0) {
      console.log("⚠️ LIMIT tidak valid:", total);
      return 0;
    }

    console.log(`🚀 Mulai add friend (followers list), target: ${LIMIT}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    let clicked = 0;

    while (clicked < LIMIT) {
      const found = await page.evaluate(() => {
        function humanClick(el) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          ["pointerdown","touchstart","mousedown","mouseup","touchend","click"]
            .forEach(type =>
              el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
            );
        }

        const buttons = [...document.querySelectorAll('div[role="button"]')]
          .filter(btn => {
            const text = (btn.innerText || "").toLowerCase();
            const aria = (btn.getAttribute("aria-label") || "").toLowerCase();

            return (
              text.includes("add friend") ||
              text.includes("tambah teman") ||
              text.includes("tambahkan teman") ||
              aria.startsWith("send a friend request") ||
              aria.startsWith("kirim permintaan pertemanan")
            );
          });

        // skip tombol Add Friend di profil
        const listButtons = buttons.slice(1);

        for (const btn of listButtons) {
          if (btn.dataset.clicked) continue;

          btn.dataset.clicked = "true";
          humanClick(btn);
          return true;
        }

        return false;
      });

      if (!found) {
        console.log("⚠️ Tidak ada Add Friend lagi di followers");
        break;
      }

      clicked++;
      console.log(`✅ Klik Add Friend ke-${clicked}`);

    const delay = randomDelay(delayMin, delayMax);
    console.log(`⏱️ Delay ${delay} ms sebelum klik berikutnya`);
    await page.waitForTimeout(delay);
      
      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.8)
      );
      await page.waitForTimeout(3000);
    }

    console.log(`🎯 Selesai. Total Add Friend: ${clicked}`);
    return clicked;

  } catch (err) {
    console.error("❌ Error addFriendByUsernameFollowers:", err.message);
    return 0;
  }
}
}
}

//FUNGSI confirm 
async function runConfirm(page, row) {
  console.log("🧪 ROW RAW:", row);
  console.log("🧪 Object keys:", Object.keys(row));
 console.log("🧪 LINK DIRECT:", row.link_targetUsername);
  
  for (const k in row) {
  console.log("FIELD:", `[${k}]`);
  }
  
  console.log(`\n📝 Mulai addFriendFollowers → ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Mulai addFriendFollowers → ${account}`);
  const total = String(row.total || "").trim();
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);
  console.log("Delay XLSX:", delayMin, delayMax);
  console.log("TOTAL:", row.total);
  
  if (!total) {
  console.log("⚠️ linkTargetUsername kosong, skip");
  return;
  }


  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  console.log(" buka Facebook ");
  await delay(3000);
  await page.goto("https://m.facebook.com/friends/");
  console.log("link frends request dibuka");
  await confirmFriendRequests(page, total, delayMin, delayMax);
}
// ==== Fungsi Confirm (ganti Add Friend) ====
async function confirmFriendRequests(page, total, delayMin, delayMax) {
  let clicked = 0;

  while (clicked < total) {
    // ambil tombol confirm
    const buttons = await page.$x(
      "//div[@role='button']//span[" +
        "contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'konfirmasi')" +
        " or contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'confirm')" +
        "]/ancestor::div[@role='button']"
    );

    if (!buttons.length) {
      console.log("🛑 Tidak ada tombol Confirm lagi");
      break;
    }
    // scroll ke tombol
    await buttons[0].evaluate(el => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(500);

    // klik tombol confirm
    await buttons[0].click();
    clicked++;
    console.log(`✅ Confirm ke-${clicked} dari ${total}`);

    // delay acak
    const delay = randomDelay(delayMin, delayMax);
    console.log(`⏱️ Delay ${delay} ms sebelum klik berikutnya`);
    await page.waitForTimeout(delay);

    // scroll halaman sedikit
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.35));
    await page.waitForTimeout(1000);
  }

  console.log(`🎯 Total Confirm selesai: ${clicked}`);

}

//FUNGSI addFriendFollowers 
async function runAddFriendFollowers(page, row) {
  console.log("🧪 ROW RAW:", row);
  console.log("🧪 Object keys:", Object.keys(row));
 console.log("🧪 LINK DIRECT:", row.link_targetUsername);
  
  for (const k in row) {
  console.log("FIELD:", `[${k}]`);
  }
  
  console.log(`\n📝 Mulai addFriendFollowers → ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Mulai addFriendFollowers → ${account}`);
  const total = String(row.total || "").trim();
  const delayMin = Number(row.delay_min || 4000);
  const delayMax = Number(row.delay_max || 8000);
  console.log("Delay XLSX:", delayMin, delayMax);
  console.log("TOTAL:", row.total);
  const linkTargetUsernameUrl = String(row.link_targetUsername || "").trim();
  console.log("LINK:", row.link_targetUsername);
  
  console.log("🧪 LINK DIRECT:", row.link_targetUsername);
console.log("🧪 LINK LOWER:", row.link_targetUsername);

  
  
  if (!total || !linkTargetUsernameUrl) {
  console.log("⚠️ linkTargetUsername kosong, skip");
  return;
  }


  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  
  await delay(3000);
// bikin array target (kalau cuma 1 link tetap aman)
const targets = [linkTargetUsernameUrl];

for (const profile of targets) {

  // 1️⃣ buka profil target
  await page.goto(profile, { waitUntil: "networkidle2" });
  console.log("👤 Profil dibuka:", profile);

  await page.waitForTimeout(3000);

  // 2️⃣ tap span followers / pengikut
  const ok = await page.evaluate(() => {
    const spans = [...document.querySelectorAll("span")];

    const target = spans.find(s => {
      const t = (s.innerText || "").toLowerCase();
      return t.includes("followers") || t.includes("pengikut");
    });

    if (!target) return false;

    target.scrollIntoView({ block: "center", behavior: "smooth" });

    const events = [
      new TouchEvent("touchstart", { bubbles: true, cancelable: true }),
      new TouchEvent("touchend", { bubbles: true, cancelable: true }),
      new PointerEvent("pointerdown", { bubbles: true }),
      new PointerEvent("pointerup", { bubbles: true }),
      new MouseEvent("mousedown", { bubbles: true }),
      new MouseEvent("mouseup", { bubbles: true }),
      new MouseEvent("click", { bubbles: true })
    ];

    events.forEach(e => target.dispatchEvent(e));

    return true;
  });

  if (!ok) {
    console.log("❌ span followers / pengikut tidak ditemukan");
    continue;
  }

  console.log("📂 Halaman followers dibuka (via tap span)");

  // tunggu halaman followers load
  await page.waitForTimeout(3000);
}

// setelah buka followers → baru add friend
await addFriendByUsernameFollowers(page,total,delayMin, delayMax);

  // FUNGSI ADDFRIEND by target username followers
async function addFriendByUsernameFollowers(page, total,delayMin, delayMax) {
  try {
    const LIMIT = Number(total) || 0;

    if (LIMIT <= 0) {
      console.log("⚠️ LIMIT tidak valid:", total);
      return 0;
    }

    console.log(`🚀 Mulai add friend (followers list), target: ${LIMIT}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    let clicked = 0;

    while (clicked < LIMIT) {
      const found = await page.evaluate(() => {
        function humanClick(el) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          ["pointerdown","touchstart","mousedown","mouseup","touchend","click"]
            .forEach(type =>
              el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
            );
        }

        const buttons = [...document.querySelectorAll('div[role="button"]')]
          .filter(btn => {
            const text = (btn.innerText || "").toLowerCase();
            const aria = (btn.getAttribute("aria-label") || "").toLowerCase();

            return (
              text.includes("add friend") ||
              text.includes("tambah teman") ||
              text.includes("tambahkan teman") ||
              aria.startsWith("send a friend request") ||
              aria.startsWith("kirim permintaan pertemanan")
            );
          });

        // skip tombol Add Friend di profil
        const listButtons = buttons.slice(1);

        for (const btn of listButtons) {
          if (btn.dataset.clicked) continue;

          btn.dataset.clicked = "true";
          humanClick(btn);
          return true;
        }

        return false;
      });

      if (!found) {
        console.log("⚠️ Tidak ada Add Friend lagi di followers");
        break;
      }

      clicked++;
      console.log(`✅ Klik Add Friend ke-${clicked}`);

    const delay = randomDelay(delayMin, delayMax);
    console.log(`⏱️ Delay ${delay} ms sebelum klik berikutnya`);
    await page.waitForTimeout(delay);
      
      await page.evaluate(() =>
        window.scrollBy(0, window.innerHeight * 0.8)
      );
      await page.waitForTimeout(3000);
    }

    console.log(`🎯 Selesai. Total Add Friend: ${clicked}`);
    return clicked;

  } catch (err) {
    console.error("❌ Error addFriendByUsernameFollowers:", err.message);
    return 0;
  }
}

}

//FUNGSI POSTING STATUS 
async function runStatus(page, row) {
  console.log(`\n📝 Post STATUS → ${row.account}`);
  const account = row.account;
  console.log(`\n📝 Post STATUS → ${account}`);
  const caption = row.caption;
  const mediaUrl = row.media_url || row.github_release;
  const delayMikir = Number(row.delay_mikir);
  const delayKetikMin = Number(row.delay_ketik_min);
  const delayKetikMax = Number(row.delay_ketik_max);
  const pauseChance = Number(row.pause_chance);
  const pauseMin = Number(row.pause_min);
  const pauseMax = Number(row.pause_max);


  if (!caption && !mediaUrl) {
    console.log("⚠️ Status kosong, skip");
    return;
  }

  // 1️⃣ BUKA HOME FB (WAJIB)
  await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
  
  await delay(3000);
  
async function clickComposerStatus(page) {
  const ok = await page.evaluate(() => {
    const keywords = [
      "what's on your mind",
      "apa yang anda pikirkan",
      "tulis sesuatu",
      "buat postingan"
    ];

    const btn = [...document.querySelectorAll('div[role="button"]')]
      .find(el =>
        keywords.some(k =>
          (el.innerText || "").toLowerCase().includes(k)
        )
      );

    if (!btn) return false;

    btn.scrollIntoView({ block: "center" });

    [
      "pointerdown",
      "touchstart",
      "mousedown",
      "mouseup",
      "touchend",
      "click"
    ].forEach(e =>
      btn.dispatchEvent(new Event(e, { bubbles: true, cancelable: true }))
    );

    return true;
  });

  console.log(
    ok ? "✅ Composer STATUS diklik" : "❌ Tombol STATUS tidak ditemukan"
  );
  return ok;
}
  
  // 3️⃣ TUNGGU TEXTBOX
  await page.waitForTimeout(2000);

  

// 1️⃣ Klik placeholder composer
 await page.waitForSelector(
    'div[role="button"][data-mcomponent="ServerTextArea"]',
     { timeout: 20000 }
    );

    await page.evaluate(() => {
     const el = document.querySelector(
        'div[role="button"][data-mcomponent="ServerTextArea"]'
     );
     if (!el) return;

     el.scrollIntoView({ block: "center" });

    ["touchstart","touchend","mousedown","mouseup","click"]
        .forEach(e =>
        el.dispatchEvent(new Event(e, { bubbles: true }))
        );
     });

  
   await page.waitForFunction(() => {
     return (
     document.querySelector('div[contenteditable="true"][role="textbox"]') ||
       document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea') ||
       document.querySelector('textarea[role="combobox"]') ||
       document.querySelector('div[data-mcomponent="ServerTextArea"]') ||
       document.querySelector('[aria-label]')
    );
  }, { timeout: 30000 });

  console.log("✅ Composer textbox terdeteksi");
  
  // await debugComposerAll(page);

  const boxHandle = await page.evaluateHandle(() => {
  return (
    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('div[contenteditable="true"]') ||
    document.querySelector('textarea') ||
    document.querySelector('textarea[role="combobox"]') ||
    document.querySelector('div[data-mcomponent="ServerTextArea"]') ||
    document.querySelector('[aria-label]')
  );
});
 const box = boxHandle.asElement();
  if (!box) {
   throw new Error("❌ Composer textbox tidak valid");
  }

    await box.focus();
    
    await page.keyboard.down("Control");
   await page.keyboard.press("A");
    await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");

  // 🔥 PAKAI FUNGSI AMAN 
  //await typeCaptionUltimate(page, caption);
  let captionResult;
try {
  captionResult = await typeCaptionUltimate(page,
  caption,
  delayMikir,
  delayKetikMin,
  delayKetikMax,
  pauseChance,
  pauseMin,
  pauseMax);
} catch (e) {
  console.log("⚠️ Caption fatal error, skip caption:", e.message);
}

console.log(
  captionResult?.ok
    ? "📝 Caption berhasil"
    : "📝 Caption dilewati"
);


  await page.keyboard.press("Space");
  await page.keyboard.press("Backspace");

   //console.log("✅ Caption diketik");

    
 await delay(3000);

  // ===== 3️⃣ Download + upload media
 const today = process.env.DATE || new Date().toISOString().split("T")[0];
 // HARUS sama dengan nama file di Release!

const originalName = mediaUrl.split("?")[0].split("/").pop();
 
  const fileName = `${account}_${Date.now()}_${originalName}`;
console.log(`✅ Posting selesai untuk ${account}`);

 // download media → simpan return value ke filePat
const filePath = await downloadMedia(mediaUrl, fileName);
console.log(`✅ Media ${fileName} berhasil di-download.`);

const stats = fs.statSync(filePath);
if (stats.size === 0) {
  throw new Error(`❌ File ${fileName} kosong! Download gagal.`);
}


// upload ke Facebook

  
await uploadMedia(page, filePath, fileName, "Photos");
   
// Cari tombol POST dengan innerText
await page.evaluate(() => {
  const keywords = [
    "post", 
    "Posting",
    "POST",
    "POSTING",
    "posting",    // ID
    "bagikan"     // ID (kadang muncul)
  ];

  const buttons = [...document.querySelectorAll('div[role="button"]')];

  const postBtn = buttons.find(btn => {
    const text = (btn.innerText || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return keywords.some(k => text === k || text.includes(k));
  });

  if (!postBtn) return false;

  postBtn.scrollIntoView({ block: "center" });
  postBtn.click();

  return true;
});

console.log("✅ Klik POST (EN+ID)");
await delay(3000);
console.log(`✅ Posting selesai untuk ${account}`);
}

//--ACAK JEDA LINK GRUPNYA --//
let lastDelay = null;

function pickRandomNoRepeat(arr) {
  if (arr.length === 1) return arr[0];

  let picked;
  do {
    picked = arr[Math.floor(Math.random() * arr.length)];
  } while (picked === lastDelay);

  lastDelay = picked;
  return picked;
}


// ===== HELPER =====
function getTodayWIB() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    })
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function urlExists(url) {
  return new Promise(resolve => {
    https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*"
        }
      },
      res => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      }
    ).on("error", () => resolve(false));
  });
}



//VERSI BARU BUAT TEST
function readTemplate(file) {
  if (!fs.existsSync(file)) {
    throw new Error("❌ File XLSX tidak ditemukan: " + file);
  }

  const wb = XLSX.readFile(file);
  const result = {};

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false
    });

    result[sheetName.trim()] = rows.map(row => {
      const clean = {};
      for (const k in row) {
        clean[k.trim()] =
          typeof row[k] === "string" ? row[k].trim() : row[k];
      }
      return clean;
    });
  }

  return result;
}

//--FUNGSI RUN ACCOUNT--//

async function runAccount(page, row) {
 console.log("\n🧪 runAccount row:", row);
  const account = row.account;
  const caption = row.caption;
  const mediaUrl = row.media_url || row.github_release;
  const delayMikir = Number(row.delay_mikir);
  const delayKetikMin = Number(row.delay_ketik_min);
  const delayKetikMax = Number(row.delay_ketik_max);
  const pauseChance = Number(row.pause_chance);
  const pauseMin = Number(row.pause_min);
  const pauseMax = Number(row.pause_max);


  // ===== PARSE DELAY GRUP DARI XLSX =====
  const delayGroupList = String(row.delay_grup || "")
  .replace(/\./g, ",")  // ganti titik jadi koma
  .split(/,/)           // split koma
  .map(v => parseInt(v.trim(), 10))
  .filter(v => !isNaN(v) && v > 0);

  const defaultDelayGroup = 5000; // fallback kalau kosong

  
  const groups = String(row.grup_link || "")
  .split(",")
  .map(g => g.replace(/[\s\r\n]+/g, "").trim()) // hapus spasi, CR, LF
  .filter(Boolean);
  
  
   if (!account || !caption || !mediaUrl || groups.length === 0) {
    console.log("⚠️ Row XLSX tidak lengkap, skip:", row);
    return;
  }

  console.log(`🧠 runAccount (XLSX) → ${account}`);
  console.log(`🔗 Grup: ${groups.length}`);
    
  for (let i = 0; i < groups.length; i++) {
    const groupUrl = groups[i];
   
    console.log(`\n📌 [${account}] Grup ${i + 1}/${groups.length}`);
    console.log(`➡️ ${groupUrl}`);
    

// ✅ Validasi URL grup
    if (!groupUrl.startsWith("http")) {
      groupUrl = "https://m.facebook.com/" + groupUrl.replace(/^\/+/, "");
    }

    if (!groupUrl.includes("/groups/")) {
      console.log("❌ URL grup tidak valid, skip:", groupUrl);
      continue; // skip kalau bukan URL grup
    }

    console.log(`\n📌 [${account}] Membuka grup ${i + 1}/${groups.length}`);
    console.log("➡️", groupUrl);
    
    // ===== Buka grup
    await page.goto(groupUrl, { waitUntil: "networkidle2" });
    await page.waitForTimeout(4000);
    // DEBUG SETELAH PAGE SIAP

  await page.evaluate(() => {
  const hits = [];

  document.querySelectorAll("span").forEach(s => {
    const t = s.textContent?.trim();
    if (t && /write|tulis|pikirkan|mind|status/i.test(t)) {
      hits.push(t);
    }
  });

  console.log("SPAN_HITS:", JSON.stringify(hits));
});


//KLIK TULISAN WRITE SOMETHING SEBELUM KOTAK CAPTION//
//async function openComposer(page) {
  //const opened = await page.evaluate(() => {
    //const span = [...document.querySelectorAll("span")]
      //.find(s =>
        //$/write something|tulis sesuatu/i
        //  .test(s.textContent || "")
     // );

    //if (!span) return false;

    //const container =
      //span.closest('[data-mcomponent="MContainer"]') ||
      //span.closest("div");

    //if (!container) return false;

    //container.scrollIntoView({ block: "center" });

   // [
     // "pointerdown",
      //"touchstart",
     // "mousedown",
    //  "mouseup",
     // "touchend",
     // "click"
   // ].forEach(e =>
      //container.dispatchEvent(
      //  new Event(e, { bubbles: true, cancelable: true })
     // )
  //  );

    //container.focus?.();
   // return true;
  //});

 // if (!opened) throw new Error("❌ Composer tidak berhasil diklik");
  //console.log("✅ Composer trigger sukses");
//}


    // ===== 1️⃣ Klik composer / write something
    let writeClicked =
    await safeClickXpath(page, "//*[contains(text(),'Write something')]", "Composer") ||
    await safeClickXpath(page, "//*[contains(text(),'Tulis sesuatu')]", "Composer") ||
    await safeClickXpath(page, "//*[contains(text(),'Tulis sesuatu...')]", "Composer");
    
    await page.waitForTimeout(2000);
   // 1️⃣ Klik placeholder composer
     await page.waitForSelector(
     'div[role="button"][data-mcomponent="ServerTextArea"]',
      { timeout: 10000 }
   );

    await page.evaluate(() => {
     const el = document.querySelector(
       'div[role="button"][data-mcomponent="ServerTextArea"]'
      );
      if (!el) return;

    el.scrollIntoView({ block: "center" });

       ["touchstart","touchend","mousedown","mouseup","click"]
        .forEach(e =>
          el.dispatchEvent(new Event(e, { bubbles: true }))
       );
       });

  
await page.waitForFunction(() => {
  return (
    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('div[contenteditable="true"]') ||
    document.querySelector('textarea') ||
    document.querySelector('textarea[role="combobox"]') ||
    document.querySelector('div[data-mcomponent="ServerTextArea"]') ||
    document.querySelector('[aria-label]')
  );
}, { timeout: 30000 });

console.log("✅ Composer textbox terdeteksi");

  const boxHandle = await page.evaluateHandle(() => {
   return (
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea') ||
      document.querySelector('textarea[role="combobox"]') ||
      document.querySelector('div[data-mcomponent="ServerTextArea"]') ||
      document.querySelector('[aria-label]')
    );
  });
const box = boxHandle.asElement();
  if (!box) {
    throw new Error("❌ Composer textbox tidak valid");
  }

   await box.focus();
    
   await page.keyboard.down("Control");
   await page.keyboard.press("A");
   await page.keyboard.up("Control");
   await page.keyboard.press("Backspace");

     let captionResult;
try {
  captionResult = await typeCaptionUltimate(page,
  caption,
  delayMikir,
  delayKetikMin,
  delayKetikMax,
  pauseChance,
  pauseMin,
  pauseMax);
} catch (e) {
  console.log("⚠️ Caption fatal error, skip caption:", e.message);
}

console.log(
  captionResult?.ok
    ? "📝 Caption berhasil"
    : "📝 Caption dilewati"
);


   await page.keyboard.press("Space");
   await page.keyboard.press("Backspace");

   console.log("✅ Caption diketik");

    
  await delay(3000); // kasih waktu 3 detik minimal


  // ===== 3️⃣ Download + upload media
 const today = process.env.DATE || new Date().toISOString().split("T")[0];
 // HARUS sama dengan nama file di Release!

const originalName = mediaUrl.split("?")[0].split("/").pop();
 
  const fileName = `${account}_${Date.now()}_${originalName}`;
console.log(`✅ Posting selesai untuk ${account}`);

 // download media → simpan return value ke filePat
const filePath = await downloadMedia(mediaUrl, fileName);
console.log(`✅ Media ${fileName} berhasil di-download.`);

const stats = fs.statSync(filePath);
if (stats.size === 0) {
  throw new Error(`❌ File ${fileName} kosong! Download gagal.`);
}


// upload ke Facebook

  
await uploadMedia(page, filePath, fileName, "Photos");
   
// Cari tombol POST dengan innerText
await page.evaluate(() => {
  const keywords = [
    "post", 
    "Posting",
    "POST",
    "POSTING",
    "posting",    // ID
    "bagikan"     // ID (kadang muncul)
  ];

  const buttons = [...document.querySelectorAll('div[role="button"]')];

  const postBtn = buttons.find(btn => {
    const text = (btn.innerText || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return keywords.some(k => text === k || text.includes(k));
  });

  if (!postBtn) return false;

  postBtn.scrollIntoView({ block: "center" });
  postBtn.click();

  return true;
});

console.log("✅ Klik POST (EN+ID)");
await delay(3000);
console.log(`✅ Posting selesai untuk ${account}`);
    
  //----FUNGSI MELAKUKAN LIKE POSTINGAN DI LINK GRUP ---////
    
 // await page.goto(groupUrl, { waitUntil: "networkidle2" });
  //console.log(" Mulai akan lakukan like postingan");
    
  //let max = 10;        // jumlah like maksimal
  //let delayMs = 3000;  // delay antar aksi (ms)
  //let clicked = 0;

 // async function delay(ms) {
   // return new Promise(res => setTimeout(res, ms));
 // }

 // while (clicked < max) {
    //const button = await page.$(
      //'div[role="button"][aria-label*="Like"],div[role="button"][aria-label*="like"], div[role="button"][aria-label*="Suka"]'
  // );

  //if (button) {
     // await button.tap(); // ✅ simulate tap (touchscreen)
      //clicked++;
    //  console.log(`👍 Klik tombol Like ke-${clicked}`);
    //} else {
      //console.log("🔄 Tidak ada tombol Like, scroll...");
   // }

    // Scroll sedikit biar postingan baru muncul
    //await page.evaluate(() => window.scrollBy(0, 500));
  // await delay(delayMs);
 //}

 //console.log(`🎉 Selesai! ${clicked} tombol Like sudah diklik.`);




// ⏳ JEDA ANTAR GRUP (ACAK, TANPA PENGULANGAN)
const delayGrup =
  delayGroupList.length > 0
    ? pickRandomNoRepeat(delayGroupList)
    : defaultDelayGroup;

console.log(`🎲 Delay grup (acak): ${delayGrup} ms`);
await delay(delayGrup);

}
  
}

//--FUNGSI KLIK ELEMEN WRITE SOMETHING --//
async function safeClickEl(el) {
  if (!el) return false;
  try {
    await el.click();
    return true;
  } catch (e) {
    console.log("⚠️ Gagal klik element:", e.message);
    return false;
  }
}

// ===== Klik composer aman pakai trigger React



      


// ===== Fungsi klik by XPath
  async function safeClickXpath(page, xpath, desc = "elemen") {
    try {
      const el = await page.waitForXPath(xpath, { visible: true, timeout: 8000 });
     await el.click();
      console.log(`✅ Klik ${desc}`);
     return true;
    } catch (e) {
     console.log(`❌ Gagal klik ${desc}:`, e.message);
      return false;
    }
  }

// ===== Fungsi scan elemen verbose
async function scanAllElementsVerbose(page, label = "Scan") {
  console.log(`\n🔎 ${label} (50 elemen pertama)`);
  const elements = await page.evaluate(() => {
    return [...document.querySelectorAll("div, span, a, button, textarea, input")]
      .slice(0, 50)
      .map((el, i) => ({
        index: i,
        tag: el.tagName,
        txt: (el.innerText || "").trim(),
        aria: el.getAttribute("aria-label"),
        placeholder: el.getAttribute("placeholder"),
        role: el.getAttribute("role"),
        href: el.getAttribute("href"),
        contenteditable: el.getAttribute("contenteditable"),
        classes: el.className
      }));
  });
   elements.forEach(el => console.log(`#${el.index}`, el));
  return elements;
}

// ===== Fungsi download media dari GitHub Release
const mediaFolder = path.join(__dirname, "media");
if (!fs.existsSync(mediaFolder)) fs.mkdirSync(mediaFolder);

async function downloadMedia(url, filename) {
  const mediaFolder = path.join(__dirname, "media");
  if (!fs.existsSync(mediaFolder)) fs.mkdirSync(mediaFolder, { recursive: true });

  const filePath = path.join(mediaFolder, filename);
  const options = {
    headers: { "User-Agent": "Mozilla/5.0 (PuppeteerBot)" }
  };

  return new Promise((resolve, reject) => {
    const request = https.get(url, options, (res) => {
    console.log("🌐 GET:", url);
    console.log("🔢 Status:", res.statusCode);
    console.log("📎 Location:", res.headers.location || "(tidak ada)");
      
      // 🔁 Handle redirect (301, 302)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log("🔁 Redirect ke:", res.headers.location);
        return resolve(downloadMedia(res.headers.location, filename));
      }

      // ❌ Handle error status
      if (res.statusCode !== 200) {
        reject(new Error(`❌ Gagal download media: ${res.statusCode}`));
        return;
      }

      // 💾 Tulis file ke disk
      const file = fs.createWriteStream(filePath);
      res.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              reject(new Error(`❌ File ${filename} kosong! Download gagal.`));
              return;
            }
            console.log(`✅ Media selesai diunduh (${(stats.size / 1024).toFixed(2)} KB): ${filePath}`);
            resolve(filePath);
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    request.on("error", (err) => {
      console.log("❌ Error saat download:", err.message);
      reject(err);
    });
  });
}

async function uploadMedia(page, filePath, fileName) {
  console.log(`🚀 Mulai upload media: ${fileName}`);

  const ext = path.extname(fileName).toLowerCase();
  const isVideo = [".mp4", ".mov"].includes(ext);

  console.log(`🧩 Deteksi ekstensi ${ext} -> isVideo=${isVideo}`);

  // ---- Klik tombol Photos / Foto / Video sesuai ekstensi ----
  try {
    if (isVideo) {
      // klik tombol Video (mencari span dengan teks "Video" lalu klik parent button)
      const clickedVideo = await page.evaluate(() => {
        const span = [...document.querySelectorAll("span")].find(s => s.textContent && s.textContent.trim().toLowerCase() === "video");
        if (!span) return false;
        const button = span.closest('div[role="button"], button');
        if (!button) return false;
        button.scrollIntoView({ block: "center", behavior: "instant" });
        ["pointerdown","touchstart","mousedown","mouseup","touchend","click"].forEach(type => {
          button.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
        });
        return true;
      });
      console.log("🎬 Klik tombol Video:", clickedVideo);
    } else {
      // klik tombol Photos/Foto
      const clickedPhotos = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('div[role="button"]')];
        const btn = buttons.find(b => {
          const text = (b.innerText || b.textContent || "").toLowerCase();
          const aria = (b.getAttribute && (b.getAttribute("aria-label") || "")).toLowerCase();
          return text.includes("photos") || text.includes("Koleksi foto") || text.includes("foto") || aria.includes("photo") || aria.includes("foto");
        });
        if (!btn) return false;
        btn.scrollIntoView({ block: "center", behavior: "instant" });
        btn.focus && btn.focus();
        ["pointerdown","pointerup","touchstart","touchend","mousedown","mouseup","click"].forEach(type => {
          btn.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
        });
        return true;
      });
      console.log("🖼 Klik tombol Photos/Foto:", clickedPhotos);
    }
  } catch (e) {
    console.log("⚠️ Error saat klik tombol media:", e.message);
  }

  // beri waktu agar input file muncul
  await page.waitForTimeout(1500 + Math.floor(Math.random() * 2500));

  // ---- Temukan input file ----
  const fileInput = (await page.$('input[type="file"][accept="image/*"]')) ||
                    (await page.$('input[type="file"][accept*="video/*"]')) ||
                    (await page.$('input[type="file"]'));
  if (!fileInput) {
    console.log("❌ Input file tidak ditemukan setelah klik tombol media — mencoba fallback scanning...");
    // coba cari input secara dinamis via evaluate (fallback)
    const inputFound = await page.evaluate(() => !!document.querySelector('input[type="file"]'));
    if (!inputFound) {
      console.log("❌ Tidak ada input[type=file] di DOM. Upload gagal.");
      return false;
    }
  }

  // ---- Siapkan MIME type ----
  const mimeType =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".png" ? "image/png" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    isVideo ? "video/mp4" :
    "application/octet-stream";

  // baca file dan ubah jadi base64 untuk inject via browser File API
  const fileNameOnly = path.basename(filePath);
  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch (e) {
    console.log("❌ Gagal baca file dari disk:", e.message);
    return false;
  }
  const base64Data = fileBuffer.toString("base64");

  // ---- Inject File object ke input agar React/JSX detect ----
  try {
    await page.evaluate(
      async ({ fileNameOnly, base64Data, mimeType }) => {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], fileNameOnly, { type: mimeType });

        const input = document.querySelector('input[type="file"]');
        if (!input) throw new Error("❌ Input file tidak ditemukan (runtime)");

        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;

        // dispatch events so React detects change
        ["input", "change"].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
        // extra events sometimes helpful
        ["focus", "blur", "keydown", "keyup"].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));

        console.log("⚡ File injected ke React dengan File API browser (in-page)");
      },
      { fileNameOnly, base64Data, mimeType }
    );
  } catch (e) {
    console.log("❌ Gagal inject File ke input:", e.message);
    return false;
  }

  console.log(`✅ File ${fileNameOnly} berhasil diinject sebagai File object (mime=${mimeType})`);

  // ---- Trigger extra events to be safe ----
  try {
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      if (input) {
        const events = ["input", "change", "focus", "blur", "keydown", "keyup"];
        events.forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true })));
      }
    });
    console.log("⚡ Event React input/change/keydown/keyup dikirim (extra)");
  } catch (e) {
    // ignore
  }

  // ---- Tunggu preview (foto / video) ----
  try {
    if (!isVideo) {
      console.log("⏳ Tunggu foto preview...");
      await page.waitForSelector(
        [
          'div[data-mcomponent="ServerImageArea"] img[scr^="data:image"]',
          'img[src^="data:image"]',
          'img[src^="blob:"]',
        ].join(","),
        { timeout: 60000 }
      );
      console.log("✅ Foto preview ready");
    } else {
      console.log("⏳ Tunggu preview video ...");
      // tunggu placeholder/thumbnail berubah
      await page.waitForSelector('div[data-mcomponent="ImageArea"] img[data-type="image"], div[data-mcomponent="ServerImageArea"] img', { timeout: 120000 });
      await page.waitForFunction(() => {
        const thumbs = [...document.querySelectorAll('div[data-mcomponent="ImageArea"] img[data-type="image"], div[data-mcomponent="ServerImageArea"] img')];
        return thumbs.some(img =>
          img.src &&
          !img.src.includes("rsrc.php") &&
          !img.src.startsWith("data:,") &&
          (img.src.includes("fbcdn.net") || img.src.startsWith("blob:") || img.src.startsWith("data:image"))
        );
      }, { timeout: 60000 });
      console.log("✅ Video preview/thumbnail ready");
    }

    // ekstra buffer waktu agar Facebook selesai memproses preview/encode
    await page.waitForTimeout(2000 + Math.floor(Math.random() * 3000));
    console.log("⏳ Buffer tambahan selesai");
  } catch (e) {
    console.log("⚠️ Preview tidak muncul dalam batas waktu, lanjutkan tetap mencoba (", e.message, ")");
  }

 // Tambah buffer agar Facebook encode selesai
  await page.waitForTimeout(5000);
  console.log("⏳ Tambahan waktu encode 5 detik selesai");


  // 6️⃣ Screenshot hasil preview
  const screenshotPath = path.join(__dirname, "media", "after_upload.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot preview media tersimpan: ${screenshotPath}`);

  const exists = fs.existsSync(screenshotPath);
  console.log(exists ? "✅ Screenshot tersimpan dengan baik" : "❌ Screenshot gagal disimpan");

   return true; //selesai 
}


module.exports = { uploadMedia };

 // 7️⃣ Optional: upload screenshot ke artifact GitHub
  if (process.env.GITHUB_ACTIONS) {
    console.log(`📤 Screenshot siap di-upload ke artifact (gunakan actions/upload-artifact di workflow)`);
  }
                                          

// 🕒 Fungsi delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Main Puppeteer

(async () => {
  try {
    console.log("🚀 Start bot...");
   //cek mode buat workflows masing-masing 
    const mode = process.argv[2];
    console.log("🎯 MODE:", mode);

    if (!mode) {
      console.log("⚠️ Tidak ada mode → stop bot");
      process.exit(0);
    }

    const rawAccounts = JSON.parse(
      fs.readFileSync(__dirname + "/accounts.json", "utf8")
    );

// 🔀 SHUFFLE AKUN DI SINI
const accounts = shuffleArray(rawAccounts);

console.log("🔀 Urutan akun setelah shuffle:");
accounts.forEach((a, i) => {
  console.log(`${i + 1}. ${a.account}`);
});
    
    
    // ✅ BACA TEMPLATE SEKALI DI AWAL
    const TEMPLATE_PATH = "./docs/template1.xlsx";

    if (!fs.existsSync(TEMPLATE_PATH)) {
      throw new Error("❌ template1.xlsx tidak ditemukan");
    }


    const templates = readTemplate(TEMPLATE_PATH);
    console.log("📑 Sheet terbaca:", Object.keys(templates));
    const groupRows = templates.postGroup || [];
    const statusRows = templates.postStatus || [];
    const addFriendFollowersRows = templates.addFriendFollowers || [];
    const addFriendFollowingRows = templates.addFriendFollowing || [];
    const addFriendListRows = templates.addFriendFriendlist || [];
    const undFriendRows = templates.undFriend || [];
    const confirmRows = templates.confirm || [];
    const likeLinkPostRows = templates.likelinkpost || [];
    const likeGroupRows= templates.likeGroup || [];
    const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
    });

    // 🔁 LOOP PER AKUN
    for (const acc of accounts) {
      console.log(`\n🚀 Start akun: ${acc.account}`);
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      // ===== PATCH BUG userAgentData FACEBOOK (WAJIB)
      await page.evaluateOnNewDocument(() => {
        try {
        if (navigator.userAgentData) {
         navigator.userAgentData.getHighEntropyValues = () => {
         return Promise.resolve({
          architecture: "arm",
          model: "",
          platform: "Android",
          platformVersion: "10",
          uaFullVersion: "120.0.0.0"
           });
           };
         }
        } catch (e) {
    // silent
        }
       });
      
      await page.setBypassCSP(true);

      // 🔊 Monitor console
      //page.on("console", msg => console.log(`📢 [${acc.account}]`, msg.text()));
     // page.on("pageerror", err => console.log("💥 [Browser Error]", err.message));

      // ===== Recorder PER AKUN
      const recorder = new PuppeteerScreenRecorder(page);
     await recorder.start(`recording_${acc.account}.mp4`);

      // ===== Anti-detect (KODE KAMU, TETAP)
      await page.setUserAgent(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
      );
      await page.setViewport({
        width: 360,
        height: 825,
        hasTouch: true,
        deviceScaleFactor: 2,
        isMobile: true
      });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        window.navigator.chrome = { runtime: {} };
        Object.defineProperty(navigator, "languages", { get: () => ["id-ID", "id"] });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      });


      const today = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
).toISOString().slice(0, 10);
      console.log("📅 TODAY (WIB):", today);
console.log("📋 Semua status rows:", statusRows);
     
     //filter status 
      const rowsStatusForAccount = statusRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      
   //coba baru filter grup 
     const rowsForAccount = groupRows.filter(row => {
    if (row.account !== acc.account) return false;
    const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
 });

      //filter addFriendFollowers 
    const rowsAddFriendFollowersForAccount = addFriendFollowersRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //filter addFriendFollowing
      const rowsAddFriendFollowingForAccount = addFriendFollowingRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //filter friends
      const rowsAddFriendFriendsForAccount = addFriendListRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
     //filter unfriend 
      const rowsUndfriendForAccount = undFriendRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
      //filter confirm 
      const rowsConfirmForAccount = confirmRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});   
      //filter likeGroup 
      const rowsLikeGroupForAccount = likeGroupRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});
     //filter likelinkpost 
      const rowsLikeLinkPostForAccount = likeLinkPostRows.filter(row => {
  if (row.account !== acc.account) return false;

  const rowDate = parseTanggalXLSX(row.tanggal);
  return rowDate === today;
});

console.log("ACCOUNT JSON:", `[${acc.account}]`);
console.log(`📋 Row untuk ${acc.account}:`, rowsForAccount.length);
      //baru 
console.log(`📋 Group row ${acc.account}:`, rowsForAccount.length);
console.log(`📋 Status row ${acc.account}:`, rowsStatusForAccount.length);
console.log(`📋 addFriendFollowers row ${acc.account}:`, rowsAddFriendFollowersForAccount.length);
console.log(`📋 addFriendFollowings row ${acc.account}:`, rowsAddFriendFollowingForAccount.length); 
console.log(`📋 addFriendListRows row ${acc.account}:`, rowsAddFriendFriendsForAccount.length);
console.log(`📋 undfriend row ${acc.account}:`, rowsUndfriendForAccount.length);
console.log(`📋 confirm row ${acc.account}:`, rowsConfirmForAccount.length);
console.log(`📋 likelinkpost row ${acc.account}:`, rowsLikeLinkPostForAccount.length);
console.log(`📋 likeGroup row ${acc.account}:`, rowsLikeGroupForAccount.length);


// kalau dua-duanya kosong → skip akun
if (rowsForAccount.length === 0 && rowsStatusForAccount.length === 0  && rowsAddFriendFollowersForAccount.length === 0 && rowsAddFriendFollowingForAccount.length === 0 && rowsAddFriendFriendsForAccount.length === 0
  && rowsUndfriendForAccount.length === 0 && rowsConfirmForAccount.length === 0 && rowsLikeGroupForAccount.length === 0 && rowsLikeLinkPostForAccount.length === 0) {
  console.log("⏭️ Tidak ada jadwal group & status & addFriendFollowers & addFriendFollowing &  addFriendFriends & unfriend & confirm & likelinkpost & likeGroup hari ini");
  continue;
}
      

await page.goto("https://m.facebook.com", { waitUntil: "networkidle2" });
    console.log("👉 BUKA FACEBOOK.COM");

      await page.waitForTimeout(3000);
      console.log("👉 Tunggu 3 detik")
      
      await page.setCookie(
     ...acc.cookies.map(c => ({
       name: c.name,
       value: c.value,
       domain: ".facebook.com",
       path: "/",
      secure: true
     }))
     );

    
      // ✅ LANGSUNG POSTGROUP PAKAI DATA
   // for (const row of rowsForAccount) {
    // await runAccount(page, row);
   // }
      // POST STATUS (kalau ada)
// for (const row of rowsStatusForAccount) {
    //await runStatus(page, row);
 // }

//for (const row of rowsAddFriendFollowersForAccount){
 // await runAddFriendFollowers(page, row);
//}
     // for (const row of rowsAddFriendFollowingForAccount){
  //await runAddFriendFollowings(page, row);
//}
    // for (const row of rowsAddFriendFriendsForAccount){
 // await runAddFriendFriends(page, row);
//}
      
//for (const row of rowsUndfriendForAccount){
    // await runUndfriends(page, row);
// }
     // for (const row of rowsConfirmForAccount){
  //await runConfirm(page, row);
//}
      
//for (const row of rowsLikeLinkPostForAccount){
    // await runLikeLinkPosts(page, row);
// }
      
//for (const row of rowsLikeGroupForAccount){
    // await runLikeLinkGroups(page, row);
// }
      // ================= MODE EXECUTION =================

if (mode === "status") {
  console.log("📌 MODE STATUS");

  for (const row of rowsStatusForAccount) {
    await runStatus(page, row);
  }
}

else if (mode === "group") {
  console.log("📌 MODE GROUP");

  for (const row of rowsForAccount) {
    await runAccount(page, row);
  }
}

else if (mode === "addfriendfollowers") {
  for (const row of rowsAddFriendFollowersForAccount) {
    await runAddFriendFollowers(page, row);
  }
}

else if (mode === "addfriendfollowing") {
  for (const row of rowsAddFriendFollowingForAccount) {
    await runAddFriendFollowings(page, row);
  }
}

else if (mode === "addfriendfriends") {
  for (const row of rowsAddFriendFriendsForAccount) {
    await runAddFriendFriends(page, row);
  }
}

else if (mode === "undfriend") {
  for (const row of rowsUndfriendForAccount) {
    await runUndfriends(page, row);
  }
}

else if (mode === "confirm") {
  for (const row of rowsConfirmForAccount) {
    await runConfirm(page, row);
  }
}

else if (mode === "likelinkpost") {
  for (const row of rowsLikeLinkPostForAccount) {
    await runLikeLinkPosts(page, row);
  }
}

else if (mode === "likegroup") {
  for (const row of rowsLikeGroupForAccount) {
    await runLikeLinkGroups(page, row);
  }
}

      
      
      // ===== Stop recorder
      await recorder.stop();
     console.log(`🎬 Rekaman selesai: recording_${acc.account}.mp4`);

      await page.close();
      await context.close();
      console.log(`✅ Posting selesai untuk ${acc.account}`);
    //await delay(6000); // jeda aman antar akun
     const delayRow = rowsForAccount.find(r => r.delay_akun);
    const delayAkun = Number(delayRow?.delay_akun) || 10000;
   console.log(
  "🕒 Delay dari row tanggal:",
  delayRow?.delay_akun,
  "→ dipakai:",
  delayAkun
);

await delay(delayAkun);
console.log(
  "DEBUG tanggal:",
  rowsForAccount.map(r => ({
    tanggal_raw: r.tanggal,
    tanggal_parse: parseTanggalXLSX(r.tanggal),
    delay_akun: r.delay_akun
  }))
);
      
    }

    await browser.close();
    console.log("🎉 Semua akun selesai");
  } catch (err) {
    console.error("❌ Error utama:", err);
  }
})();
      
