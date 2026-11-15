require("dotenv").config();

// Cegah bot berhenti saat terjadi disconnect socket / jaringan tidak stabil
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Baileys/Network Unhandled Rejection (bot tetap aktif):", reason?.message || reason);
});
process.on("uncaughtException", (error) => {
  console.error("⚠️ Baileys/Network Uncaught Exception (bot tetap aktif):", error?.message || error);
});

const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const { execFile } = require("child_process");
const GS_CMD = process.env.GS_CMD || "gswin64c";

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    return res.status(200).json({});
  }
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const HISTORY_FILE = path.join(__dirname, "history.json");
const PINJAMAN_FILE = path.join(__dirname, "pinjaman.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const MAX_HISTORY_ITEMS = 10;
const MODEL = "openai/gpt-oss-120b:free";
function compressPDF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook", // bisa ganti: /screen /ebook /printer
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    execFile(GS_CMD, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
function checkGhostscript() {
  return new Promise((resolve) => {
    execFile(GS_CMD, ["--version"], (err, stdout) => {
      if (err) {
        console.warn("⚠️ Ghostscript tidak terdeteksi (PDF compression nonaktif). Set GS_CMD di .env jika Ghostscript terinstal.");
      } else {
        console.log("Ghostscript version:", stdout.trim());
      }
      resolve();
    });
  });
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}


// ===== load / save pinjaman =====
function loadPinjaman() {
  try {
    if (!fs.existsSync(PINJAMAN_FILE)) return [];
    const raw = fs.readFileSync(PINJAMAN_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("Gagal load pinjaman.json, membuat baru. Error:", e.message);
    return [];
  }
}
function savePinjaman(pinjaman) {
  try {
    fs.writeFileSync(PINJAMAN_FILE, JSON.stringify(pinjaman, null, 2));
  } catch (e) {
    console.error("Gagal simpan pinjaman.json:", e.message);
  }
}


function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ai_active: true };
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(raw || "{\"ai_active\":true}");
  } catch (e) {
    console.error("Gagal load settings.json, membuat baru. Error:", e.message);
    return { ai_active: true };
  }
}
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("Gagal simpan settings.json:", e.message);
  }
}

let pinjamanDB = loadPinjaman();
let settings = loadSettings();

// ===== load / save history =====
function loadHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Gagal load history.json, membuat baru. Error:", e.message);
    return {};
  }
}
function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error("Gagal simpan history.json:", e.message);
  }
}

let conversationHistory = loadHistory();

const SYSTEM_PROMPT = {
  role: "system",
  content: `Kamu adalah asisten digital di WhatsApp untuk instansi MRC (Maintenance Repair Calibration), peminjaman barang dan layanan teknis komputer/jaringan di SMKN 1 Subang.
  
  Ruang MRC bertempat di bagian barat sekolah, dekat dengan toilet siswa di pojok.
  
  Tugas kamu adalah membalas setiap pesan dengan ramah, jelas, asyik remaja kekinian, dan profesional, menggunakan bahasa Indonesia yang santai sehari-hari dan mudah dipahami namun tetap sopan, gunakan sedikit emoji juga agar tidak kaku.
  
  Barang-barang yang bisa dipinjam antara lain:
  - Proyektor (sudah termasuk kabel VGA, kabel power, kabel HDMI)
  - Terminal listrik
  - Kabel HDMI 5 meter
  - Layar proyektor
  - Laptop
  - Mouse
  - Tablet
  - Tripod HP

  Catatan penting:
  - Jam operasional MRC adalah mengikuti jadwal sekolah, Senin-Jumat pukul 06.30-16.00 WIB.
  - Peminjaman hanya bisa dilakukan oleh guru atau staf dengan identitas yang jelas (gunakan ID Card jika diwakili oleh siswa).
  - Peminjaman barang harus kembali dengan kondisi baik dan lengkap.
  - Peminjaman laptop maksimal 10 unit.

  Selain peminjaman barang, MRC juga menyediakan layanan seperti:
  - Perbaikan komputer/laptop
  - Penginstalan software
  - Perbaikan jaringan internet dan perangkatnya
  - Jasa lain yang berkaitan dengan komputer dan jaringan

  Kamu hanya menjawab pesan yang berkaitan dengan konteksnya, jangan sebutkan hal lain selain konteks yang disebutkan. Tanyakan dengan sopan keperluan pengguna dan bantu sesuai prosedur yang berlaku.

  Jika ada yang menanyakan tentang tata cara menggunakan barang yang dipinjam, jelaskan secara singkat cara menggunakannya sesuai fungsi utamanya.

  Jangan pernah menawarkan layanan atau barang yang tidak ada di MRC.
  
  Jika ada pesan di luar dari itu, tetap balas dengan sopan dan bantu sesuai kemampuan. Jangan pernah memberikan informasi yang salah atau menyesatkan. Kalau tidak yakin, arahkan ke admin MRC.

  Balas dengan double huruf agar terlihat ramah dalam percakapan seperti remaja pada umumnya.
  Gunakan simbol asterisk jika ingin formatting *bold* di teksnya.
  Jangan pernah menambahkan asterisk di akhir atau awal pesan jika tidak sedang mem-format teks bold.`,
};

// ===== helper untuk memastikan key history valid =====
function ensureUserHistoryKey(key) {
  if (!conversationHistory[key] || !Array.isArray(conversationHistory[key])) {
    conversationHistory[key] = [SYSTEM_PROMPT];
  } else {
    if (
      !conversationHistory[key].length ||
      conversationHistory[key][0].role !== "system"
    ) {
      conversationHistory[key].unshift(SYSTEM_PROMPT);
    }
  }
}

function getMessageForDownload(msg) {
  if (msg.message?.documentMessage) return msg;

  if (msg.message?.documentWithCaptionMessage) {
    return {
      key: msg.key,
      message: msg.message.documentWithCaptionMessage.message
    };
  }

  return msg;
}


function extractPdfMessage(msg) {
  // PDF dikirim langsung
  if (msg.message?.documentMessage?.mimetype === "application/pdf") {
    return msg;
  }

  // PDF dari reply / forwarded
  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (quoted?.documentMessage?.mimetype === "application/pdf") {
    // ❗ PENTING: tetap pakai msg ASLI, bukan quoted
    return msg;
  }

  return null;
}

function getAnyDocumentMessage(msg) {
  // normal document
  if (msg.message?.documentMessage) {
    return msg.message.documentMessage;
  }

  // document with caption (WA baru)
  if (msg.message?.documentWithCaptionMessage?.message?.documentMessage) {
    return msg.message.documentWithCaptionMessage.message.documentMessage;
  }

  // quoted / forwarded
  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (quoted?.documentMessage) {
    return quoted.documentMessage;
  }

  if (quoted?.documentWithCaptionMessage?.message?.documentMessage) {
    return quoted.documentWithCaptionMessage.message.documentMessage;
  }

  return null;
}


// ===== fungsi untuk memanggil OpenRouter / model =====
async function getAIResponse(messages) {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: MODEL,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const content =
      res?.data?.choices?.[0]?.message?.content ||
      res?.data?.choices?.[0]?.message?.text;
    return typeof content === "string" && content.length
      ? content
      : "❌ AI tidak memberikan respon yang dapat dibaca";
  } catch (err) {
    console.error("Error dari OpenRouter:", err?.message || err);
    return "❌ Gagal mendapatkan respon AI";
  }
}

// ===== start bot =====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();
  await checkGhostscript();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sockGlobal = sock;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("Scan QR berikut untuk login WhatsApp:");
      qrcode.generate(qr, { small: true });
      // Generate QR as data URL for web dashboard
      try {
        waState.qrDataUrl = await QRCode.toDataURL(qr, { width: 300 });
      } catch (e) {
        console.error("QR toDataURL error:", e.message);
      }
      waState.status = "qr";
    }
    if (connection === "close") {
      waState.status = "disconnected";
      waState.qrDataUrl = null;
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("Koneksi terputus, reconnect...");
        startBot();
      } else {
        console.log("Anda logout, menghapus folder auth_info...");
        // Auto-delete auth_info on logout
        const authDir = path.join(__dirname, "auth_info");
        try {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log("✅ Folder auth_info berhasil dihapus.");
          }
        } catch (e) {
          console.error("Gagal hapus auth_info:", e.message);
        }
        // Restart bot so new QR appears
        setTimeout(() => startBot(), 2000);
      }
    } else if (connection === "connecting") {
      waState.status = "connecting";
    } else if (connection === "open") {
      waState.status = "connected";
      waState.qrDataUrl = null;
      console.log("✅ Bot WhatsApp MRC siap!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    // ====== KONFIGURASI LOKASI DAN ADMIN ======
    const MRC_LOCATION = {
      latitude: -6.5556091,
      longitude: 107.7593109,
      name: "MRC SMKN 1 Subang",
      address: "SMKN 1 Subang, Jl. Arief Rahman Hakim No.35, Subang, Jawa Barat"
    };
    // Kontak admin (bisa lebih dari satu)
    const ADMIN_CONTACTS = [
      {
        displayName: "Pak Hakim (MRC)",
        vcard: [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "FN:Pak Hakim (MRC)",
          "TEL;type=CELL;waid=6288706320887:+62 887-0632-0887",
          "END:VCARD"
        ].join("\n")
      }
    ];

    try {
      const adminNumbers = ["6288706320887@s.whatsapp.net", "6288218366466@s.whatsapp.net"];
      const msg = m.messages[0];
      if (!msg || !msg.message) return;

      // Track message for web dashboard (both incoming and outgoing)
      const dashText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.documentMessage?.caption ||
        "";
      if (dashText || !msg.key.fromMe) {
        waState.recentMessages.push({
          id: msg.key.id,
          from: msg.key.remoteJid,
          pushName: msg.pushName || "",
          text: dashText || "(media)",
          timestamp: (msg.messageTimestamp || Math.floor(Date.now() / 1000)),
          fromMe: !!msg.key.fromMe,
        });
        if (waState.recentMessages.length > MAX_RECENT_MESSAGES) {
          waState.recentMessages = waState.recentMessages.slice(-MAX_RECENT_MESSAGES);
        }
      }

      if (msg.key.fromMe) return;

      // DEBUG: log isi pesan WhatsApp mentah untuk analisis katalog/cart
      try {
        console.log('DEBUG RAW MESSAGE:', JSON.stringify(msg.message, null, 2));
      } catch (e) {
        console.log('DEBUG RAW MESSAGE (stringify error):', msg.message);
      }
      const from = msg.key.remoteJid;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.documentMessage?.caption ||
        "";
      const isMediaMessage = !!getAnyDocumentMessage(msg);


      // Jika AI mati, blok hanya TEXT biasa, tapi IZINKAN media/file
      if (
        !settings.ai_active &&
        !isMediaMessage &&
        !text.trim().toLowerCase().startsWith("/msg ") &&
        text.trim().toLowerCase() !== "/reset" &&
        text.trim().toLowerCase() !== "hapus history" &&
        text.trim().toLowerCase() !== "/ping" &&
        text.trim().toLowerCase() !== "/help" &&
        text.trim().toLowerCase() !== "/faq" &&
        text.trim().toLowerCase() !== "/stats" &&
        text.trim().toLowerCase() !== "/bc" &&
        text.trim().toLowerCase() !== "/stok" &&
        text.trim().toLowerCase() !== "/lokasi" &&
        text.trim().toLowerCase() !== "/admin" &&
        !text.trim().toLowerCase().startsWith("/cek") &&
        !(global.broadcastState && global.broadcastState[from]?.waiting)
      ) {
        return;
      }


      console.log(
        `[${new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })}] 📩 Pesan dari ${from}: ${text}`
      );

      ensureUserHistoryKey(from);
      let isFirstChat = false;
      if (
        Array.isArray(conversationHistory[from]) &&
        conversationHistory[from].length === 1 &&
        conversationHistory[from][0].role === "system"
      ) {
        isFirstChat = true;
      }

      if (isFirstChat) {
        let namaUser = msg.pushName || "";
        let sapaan = namaUser ? `Hai, *${namaUser}*! 👋\n` : "Hai! 👋\n";
        let perkenalan = `${sapaan}Selamat datang di *MRC SMKN 1 Subang*\n\nAku asisten digital untuk peminjaman barang, layanan komputer/jaringan, dan info seputar MRC.\n\nKetik \`/help\` untuk melihat daftar perintah dan layanan yang tersedia.`;
        await sock.sendMessage(from, {
          text: perkenalan
        });
        conversationHistory[from].push({ role: "assistant", content: perkenalan });
        saveHistory(conversationHistory);
      }

      try {
        await sock.presenceSubscribe(from);
        await sock.sendPresenceUpdate("composing", from);
      } catch (e) {
        console.warn("Presence update error (ignored):", e.message || e);
      }

      if (text.trim().toLowerCase().startsWith("/msg ")) {
        if (!adminNumbers.includes(from)) {
          await sock.sendMessage(from, { text: "❌ Command /msg hanya bisa digunakan oleh admin." });
          return;
        }
        const match = text.trim().match(/^\/msg\s+(\d{8,15})\s+([\s\S]+)/i);
        if (!match) {
          await sock.sendMessage(from, { text: "Format salah. Contoh: /msg 62812345678 Halo, ini pesan!" });
          return;
        }
        const tujuan = match[1];
        const pesan = match[2];
        const jidTujuan = tujuan.includes("@s.whatsapp.net") ? tujuan : tujuan + "@s.whatsapp.net";
        try {
          await sock.sendMessage(jidTujuan, { text: pesan });
          await sock.sendMessage(from, { text: `✅ Pesan berhasil dikirim ke ${tujuan}` });
        } catch (e) {
          await sock.sendMessage(from, { text: `❌ Gagal kirim pesan ke ${tujuan}: ${e.message || e}` });
        }
        return;
      }

      // ===== HANDLE PDF COMPRESSION =====
      const doc = getAnyDocumentMessage(msg);

      if (doc && doc.mimetype === "application/pdf") {
        const originalName = doc.fileName || "file.pdf";
        const baseName = originalName.replace(/\.pdf$/i, "");
        const compressedName = `${baseName}_compressed.pdf`;

        const tmpDir = path.join(__dirname, "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

        const inputPath = path.join(tmpDir, originalName);
        const outputPath = path.join(tmpDir, compressedName);

        const progressMsg = await sock.sendMessage(
          from,
          { text: "⏳ Mengompres PDF..." },
          { quoted: msg } // reply ke pesan PDF
        );


        let buffer;
        try {
          const downloadMsg = getMessageForDownload(msg);

          buffer = await downloadMediaMessage(
            downloadMsg,
            "buffer",
            {},
            {
              logger: console,
              reuploadRequest: sock.updateMediaMessage
            }
          );
        } catch (e) {
          console.error("DOWNLOAD PDF ERROR:", e);
          await sock.sendMessage(from, { text: "❌ Gagal mengambil PDF." });
          return;
        }

        fs.writeFileSync(inputPath, buffer);

        try {
          await compressPDF(inputPath, outputPath);
          const beforeSize = fs.statSync(inputPath).size;
          const afterSize = fs.statSync(outputPath).size;
          const savedPercent = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);
          await sock.sendMessage(from, {
            text:
              "✅ *Kompresi PDF Selesai*\n\n" +
              `📄 ${formatBytes(beforeSize)} → ${formatBytes(afterSize)}\n` +
              `📉 Hemat *${savedPercent}%*`,
            edit: progressMsg.key
          });

          await sock.sendMessage(from, {
            document: fs.readFileSync(outputPath),
            fileName: compressedName,
            mimetype: "application/pdf"
          });
        } catch (e) {
          console.error("COMPRESS ERROR:", e);
          await sock.sendMessage(from, { text: "❌ Gagal mengompress PDF." });
        }

        fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        return;
      }


      if (
        text.trim().toLowerCase() === "/reset" ||
        text.trim().toLowerCase() === "hapus history"
      ) {
        conversationHistory[from] = [SYSTEM_PROMPT];
        saveHistory(conversationHistory);
        await sock.sendMessage(from, {
          text: "✅ Riwayat percakapanmu sudah direset.",
        });
        return;
      }

      if (text.trim().toLowerCase() === "/ping") {
        const ms = Date.now() - msg.messageTimestamp * 1000;
        await sock.sendMessage(from, { text: `Pong! 🏓 (${ms} ms)` });
        return;
      }

      if (text.trim().toLowerCase() === "/lokasi") {
        await sock.sendMessage(from, {
          location: {
            degreesLatitude: MRC_LOCATION.latitude,
            degreesLongitude: MRC_LOCATION.longitude,
            name: MRC_LOCATION.name,
            address: MRC_LOCATION.address
          }
        });
        return;
      }

      if (text.trim().toLowerCase() === "/admin") {
        await sock.sendMessage(from, {
          contacts: {
            displayName: "Admin MRC",
            contacts: ADMIN_CONTACTS.map(c => ({ displayName: c.displayName, vcard: c.vcard }))
          }
        });
        return;
      }

      if (text.trim().toLowerCase().startsWith("/cek")) {
        // Jika hanya '/cek' tanpa nama
        if (text.trim().toLowerCase() === "/cek") {
          await sock.sendMessage(from, { text: "Format salah. Ketik: `/cek {nama guru}`\nContoh: `/cek Ahmad Hakim Makarim`" });
          return;
        }
        // Jika '/cek {nama}'
        if (text.trim().toLowerCase().startsWith("/cek ")) {
          try {
            const query = text.trim().slice(5).toLowerCase();
            const MRC_API_BASE = process.env.MRC_API_BASE || "http://127.0.0.1:3554/api";
            let borrowers = [], loans = [], items = [];
            try {
              const [bRes, lRes, iRes] = await Promise.all([
                axios.get(`${MRC_API_BASE}/borrowers`, { timeout: 4000 }),
                axios.get(`${MRC_API_BASE}/loans`, { timeout: 4000 }),
                axios.get(`${MRC_API_BASE}/items`, { timeout: 4000 })
              ]);
              borrowers = bRes.data;
              loans = lRes.data;
              items = iRes.data;
            } catch (apiErr) {
              const bPath = path.join(__dirname, "..", "mrc", "database", "borrowers.json");
              const lPath = path.join(__dirname, "..", "mrc", "database", "loans.json");
              const iPath = path.join(__dirname, "..", "mrc", "database", "items.json");
              if (fs.existsSync(bPath) && fs.existsSync(lPath) && fs.existsSync(iPath)) {
                borrowers = JSON.parse(fs.readFileSync(bPath, "utf8"));
                loans = JSON.parse(fs.readFileSync(lPath, "utf8"));
                items = JSON.parse(fs.readFileSync(iPath, "utf8"));
              } else {
                await sock.sendMessage(from, { text: "❌ Gagal terhubung ke API Web MRC (" + (apiErr.message || apiErr) + ")" });
                return;
              }
            }
            // Cari peminjam paling relevan (paling atas yang namanya mengandung query, case-insensitive, urutkan by kemiripan string)
            const scored = borrowers.map(b => ({
              ...b,
              score: b.name.toLowerCase().includes(query) ? 100 - Math.abs(b.name.length - query.length) : 0
            })).filter(b => b.score > 0).sort((a, b) => b.score - a.score);
            if (!scored.length) {
              await sock.sendMessage(from, { text: `❌ Tidak ditemukan peminjam dengan nama "${query}".` });
              return;
            }
            const borrower = scored[0];
            // Ambil semua loans milik borrower ini, urutkan terbaru dulu
            const borrowerLoans = loans.filter(l => l.borrowerId === borrower.id).sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
            if (!borrowerLoans.length) {
              await sock.sendMessage(from, { text: `Tidak ada riwayat peminjaman untuk *${borrower.name}*.` });
              return;
            }
            // Format detail
            let nipLine = "";
            if (borrower.nip) {
              nipLine = `NIP: ${borrower.nip}\n`;
            } else if (borrower.officerId) {
              nipLine = `ID Pegawai: ${borrower.officerId}\n`;
            }
            let msg = `📋 *Riwayat Peminjaman*\nNama: *${borrower.name}*\n${nipLine}Total peminjaman: *${borrowerLoans.length}*\n\n`;
            for (const loan of borrowerLoans.slice(0, 3)) { // tampilkan max 3 terakhir
              const tglPinjam = new Date(loan.borrowDate).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
              const tglJatuhTempo = new Date(loan.dueDate).toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
              });
              const tglKembali = loan.returnDate
                ? new Date(loan.returnDate).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })
                : "-";
              msg += `🆔 ID: *${loan.id}*\n`;
              msg += `- Tgl Pinjam: *${tglPinjam}*\n`;
              msg += `- Jatuh Tempo: *${tglJatuhTempo}*\n`;
              if (loan.status === "dikembalikan") {
                msg += `- Status: *${loan.status}* ✅\n`;
              } else if (loan.status === "dipinjam") {
                msg += `- Status: *${loan.status}* ⚠️\n`;
              } else {
                msg += `- Status: *${loan.status}*\n`;
              }
              msg += `- Keperluan: *${loan.purpose || "-"}*\n`;
              if (loan.notes) msg += `- Catatan: ${loan.notes}\n`;
              msg += `- 📦 Barang:\n`;
              // Group serialNumbers by item name
              const serialToName = {};
              // items.json sometimes uses different keys for serials (sn, serialNumber, rfidCode, etc.)
              for (const item of items) {
                if (Array.isArray(item.items)) {
                  for (const sub of item.items) {
                    const candidates = [
                      sub.serialNumber,
                      sub.sn,
                      sub.rfidCode,
                      sub.serial,
                      sub.serial_no,
                      sub.s_n
                    ];
                    for (const c of candidates) {
                      if (c !== undefined && c !== null && c.toString().trim() !== "") {
                        serialToName[c.toString()] = item.name;
                      }
                    }
                  }
                }
              }
              // Group loaned serialNumbers by name
              const nameGroups = {};
              loan.items.forEach(it => {
                const candidates = [
                  it.serialNumber,
                  it.sn,
                  it.rfidCode,
                  it.serial,
                  it.serial_no,
                  it.s_n
                ];
                let serialVal = '';
                for (const c of candidates) {
                  if (c !== undefined && c !== null && c.toString().trim() !== "") {
                    serialVal = c.toString();
                    break;
                  }
                }
                const name = serialVal && serialToName[serialVal] ? serialToName[serialVal] : '(Tidak diketahui)';
                if (!nameGroups[name]) nameGroups[name] = [];
                nameGroups[name].push(serialVal);
              });
              let idx = 1;
              for (const [name, serials] of Object.entries(nameGroups)) {
                msg += `${idx++}. ${name} (${serials.length}x)\n`;
              }
              if (loan.status === "dikembalikan") msg += `- Tgl Kembali: *${tglKembali}*\n`;
              msg += `\n`;
            }
            if (borrowerLoans.length > 3) msg += `Dan ${borrowerLoans.length - 3} peminjaman lainnya...`;
            await sock.sendMessage(from, { text: msg });
          } catch (e) {
            await sock.sendMessage(from, { text: `❌ Gagal cek riwayat: ${e.message || e}` });
          }
          return;
        }
      }

      if (text.trim().toLowerCase() === "/stok") {
        try {
          const MRC_API_BASE = process.env.MRC_API_BASE || "http://127.0.0.1:3554/api";
          let items = [];
          try {
            const res = await axios.get(`${MRC_API_BASE}/items`, { timeout: 4000 });
            items = res.data;
          } catch (apiErr) {
            const iPath = path.join(__dirname, "..", "mrc", "database", "items.json");
            if (fs.existsSync(iPath)) {
              items = JSON.parse(fs.readFileSync(iPath, "utf8"));
            } else {
              await sock.sendMessage(from, { text: "❌ Gagal mengambil data stok dari API (" + (apiErr.message || apiErr) + ")" });
              return;
            }
          }
          if (!Array.isArray(items) || items.length === 0) {
            await sock.sendMessage(from, { text: "❌ Tidak ada data stok barang." });
            return;
          }
          let stokMsg = `📦 *Daftar Stok Barang MRC*\n\n`;
          for (const item of items) {
            let available = 0;
            if (Array.isArray(item.items)) {
              available = item.items.filter(sub => sub.status === 1).length;
            }
            stokMsg += `- ${item.name}  (*${available}x*)\n`;
          }
          await sock.sendMessage(from, { text: stokMsg });
        } catch (e) {
          await sock.sendMessage(from, { text: `❌ Gagal mengambil data stok: ${e.message || e}` });
        }
        return;
      }

      if (text.trim().toLowerCase() === "/help") {
        let helpMsg = `🤖 *Command Bot MRC*\n\n`;
        helpMsg += `Ketik pesan apa saja untuk memulai percakapan dengan bot.\n\n`;
        helpMsg += `*Perintah yang tersedia:*\n`;
        helpMsg += `- \`/ping\` - Mengecek koneksi\n`;
        helpMsg += `- \`/help\` - Menampilkan bantuan ini\n`;
        helpMsg += `- \`/faq\` - Menampilkan daftar pertanyaan umum (FAQ)\n`;
        helpMsg += `- \`/stats\` - Menampilkan statistik bot\n`;
        helpMsg += `- \`/stok\` - Menampilkan daftar stok barang di MRC\n`;
        helpMsg += `- \`/cek {nama}\` - Cek riwayat peminjaman berdasarkan nama peminjam\n`;
        helpMsg += `- \`/lokasi\` - Share lokasi ruang MRC\n`;
        helpMsg += `- \`/admin\` - Contact person MRC\n`;
        await sock.sendMessage(from, { text: helpMsg });
        return;
      }

      if (text.trim().toLowerCase() === "/faq") {
        const faqList = [
          {
            q: "Layanan apa saja yang tersedia di MRC?",
            a: "Peminjaman barang, perbaikan komputer/laptop, instalasi software, perbaikan jaringan."
          },
          {
            q: "Jam operasional?",
            a: "Senin-Jumat, 06:30 - 16:00 WIB."
          },
          {
            q: "Bagaimana cara meminjam?",
            a: "Datang ke MRC oleh guru, tanda tangan form peminjaman, dan bawa barang yang dipinjam."
          },
          {
            q: "Siapa yang boleh meminjam?",
            a: "Guru atau staf sekolah dengan identitas yang jelas."
          },
          {
            q: "Batas peminjaman?",
            a: "Maksimum 7 unit per peminjaman."
          },
          {
            q: "Apa syarat pengembalian?",
            a: "Dikembalikan dalam kondisi baik dan lengkap (semua aksesoris)."
          },
          {
            q: "Dimana lokasi MRC?",
            a: "Ketik `/lokasi` untuk mendapatkan lokasi MRC di WhatsApp."
          },
          {
            q: "Kontak admin?",
            a: "Ketik `/admin` untuk mendapatkan kontak admin MRC."
          }
        ];

        let payload = "*📚 FAQ - MRC SMKN 1 Subang*";
        faqList.forEach((item, i) => {
          payload += `\n\n${i + 1}. *${item.q}*\n${item.a}`;
        });
        await sock.sendMessage(from, { text: payload });
        return;
      }

      if (text.trim().toLowerCase() === "/stats") {
        const uptimeMs = Date.now() - BOT_START_TIME;
        const s = Math.floor(uptimeMs / 1000) % 60;
        const m = Math.floor(uptimeMs / 1000 / 60) % 60;
        const h = Math.floor(uptimeMs / 1000 / 60 / 60) % 24;
        const d = Math.floor(uptimeMs / 1000 / 60 / 60 / 24);
        const uptimeStr = `${d} hari, ${h} jam, ${m} menit, ${s} detik`;

        const userCount = Object.keys(conversationHistory).length;

        const totalPeminjaman = pinjamanDB.length;
        const aktif = pinjamanDB.filter(p => p.status === "dipinjam").length;
        const kembali = pinjamanDB.filter(p => p.status === "dikembalikan").length;

        let statsMsg = `📊 *Statistik Bot MRC*\n\n`;
        statsMsg += `⏱️ Uptime: *${uptimeStr}*\n`;
        statsMsg += `👥 User chat: *${userCount}*\n`;
        statsMsg += `📦 Total peminjaman: *${totalPeminjaman}*\n`;
        statsMsg += `🟢 Peminjaman aktif: *${aktif}*\n`;
        statsMsg += `✅ Sudah dikembalikan: *${kembali}*\n`;
        await sock.sendMessage(from, { text: statsMsg });
        return;
      }

      if (text.trim().toLowerCase() === "/bc") {
        if (!adminNumbers.includes(from)) {
          await sock.sendMessage(from, { text: "❌ Command /bc hanya bisa digunakan oleh admin." });
          return;
        }
        // Simpan state broadcast di memory
        if (!global.broadcastState) global.broadcastState = {};
        global.broadcastState[from] = { waiting: true };
        const userCount = Object.keys(conversationHistory).length;
        await sock.sendMessage(from, { text: `📢 Kirim teks broadcast yang akan dikirim ke ${userCount} pengguna.\n\nKetik \`batal\` untuk membatalkan.` });
        return;
      }
      // Jika sedang menunggu pesan broadcast
      if (global.broadcastState && global.broadcastState[from]?.waiting) {
        if (!adminNumbers.includes(from)) {
          global.broadcastState[from] = null;
          await sock.sendMessage(from, { text: "❌ Command broadcast hanya bisa digunakan oleh admin." });
          return;
        }
        if (text.trim().toLowerCase() === "batal") {
          global.broadcastState[from] = null;
          await sock.sendMessage(from, { text: "❌ Broadcast dibatalkan." });
          return;
        }
        const userJids = Object.keys(conversationHistory).filter(jid => jid.endsWith("@s.whatsapp.net"));
        let sentCount = 0;
        for (const jid of userJids) {
          try {
            await sock.sendMessage(jid, { text });
            sentCount++;
          } catch (e) {
            console.error(`❌ Gagal kirim broadcast ke ${jid}:`, e.message || e);
          }
        }
        await sock.sendMessage(from, { text: `✅ Pesan broadcast telah dikirim ke ${sentCount} orang!` });
        global.broadcastState[from] = null;
        return;
      }

      // Hanya balas AI secara normal
      if (settings.ai_active) {
        conversationHistory[from].push({ role: "user", content: text });
        const historySansSystem = conversationHistory[from].slice(1);
        const messagesToSend = [
          SYSTEM_PROMPT,
          ...historySansSystem.slice(-MAX_HISTORY_ITEMS),
        ];

        const aiReply = await getAIResponse(messagesToSend);
        conversationHistory[from].push({ role: "assistant", content: aiReply });
        const system = conversationHistory[from][0];
        const rest = conversationHistory[from].slice(1).slice(-MAX_HISTORY_ITEMS);
        conversationHistory[from] = [system, ...rest];
        saveHistory(conversationHistory);
        await sock.sendMessage(from, { text: aiReply });
        // Track outgoing message for web dashboard
        waState.recentMessages.push({
          id: "bot-" + Date.now(),
          from: from,
          pushName: "MRC Bot",
          text: aiReply,
          timestamp: Math.floor(Date.now() / 1000),
          fromMe: true,
        });
        if (waState.recentMessages.length > MAX_RECENT_MESSAGES) {
          waState.recentMessages = waState.recentMessages.slice(-MAX_RECENT_MESSAGES);
        }
        try {
          await sock.sendPresenceUpdate("available", from);
        } catch (e) {
          console.warn("Presence available error (ignored):", e.message || e);
        }
      }
    } catch (err) {
      console.error("Handler messages.upsert error:", err);
    }
  });
}

let sockGlobal;
const BOT_START_TIME = Date.now();

// ===== WhatsApp Dashboard State =====
const waState = {
  status: "disconnected", // "connected" | "disconnected" | "connecting" | "qr"
  qrDataUrl: null,        // base64 QR image for web
  recentMessages: [],     // { id, from, pushName, text, timestamp, fromMe }
};
const MAX_RECENT_MESSAGES = 200;

// Endpoint untuk peminjaman barang

const defaultLoanTemplate = `📢 Yth. *{name}*,\nAnda telah melakukan peminjaman barang dari *MRC*\n\n🗓 Tanggal Pinjam: *{startDate}*\n📋 Barang yang Dipinjam:\n{items}\n\n📅 Jatuh Tempo: *{dueDate}*\n📌 Keperluan: *{purpose}*\n{notes}\n⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.\n\n_Maintenance Repair Calibration_ 🛠️`;

const defaultReturnTemplate = `Horeeee🎉\n\n✅ Yth. *{name}*,\nTerima kasih sudah mengembalikan barang ke *MRC*!\n\n📋 Barang yang dikembalikan:\n{items}\n\n🗓 Tanggal Pinjam: *{startDate}*\n📌 Keperluan: *{purpose}*\n{notes}\n⏳ Durasi peminjaman: *{duration}*\n\nBarang sudah diterima dalam keadaan baik dan lengkap yaa. Kalau butuh bantuan atau mau pinjam lagi, silakan hubungi MRC kapan ajaa 😁✨\n\n_Maintenance Repair Calibration_ 🛠️`;

const defaultReminderTemplate = `📢 Yth. *{name}*,\nAnda *belum mengembalikan* barang yang dipinjam dari *MRC*\n\n🗓 Tanggal Pinjam: *{startDate}*\n📋 Barang yang Dipinjam:\n{items}\n\n📅 Jatuh Tempo: *{dueDate}*\n📌 Keperluan: *{purpose}*\n{notes}\n⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.\n\n_Maintenance Repair Calibration_ 🛠️\n\n> _Abaikan pesan ini jika sudah mengembalikan_`;

async function getDynamicTemplate(type) {
  try {
    const MRC_API_BASE = process.env.MRC_API_BASE || "http://127.0.0.1:3554/api";
    const res = await axios.get(`${MRC_API_BASE}/settings`, { timeout: 3000 });
    if (res.data && res.data.messages) {
      if (type === "loan" && res.data.messages.loanTemplate) return res.data.messages.loanTemplate;
      if (type === "return" && res.data.messages.returnTemplate) return res.data.messages.returnTemplate;
      if (type === "reminder" && res.data.messages.reminderTemplate) return res.data.messages.reminderTemplate;
    }
  } catch (e) {
    // fallback
  }
  if (type === "loan") return defaultLoanTemplate;
  if (type === "return") return defaultReturnTemplate;
  if (type === "reminder") return defaultReminderTemplate;
  return "";
}

// Helper untuk membaca buffer foto (base64, file lokal, atau via URL)
async function getImageBuffer(photo) {
  if (!photo || typeof photo !== "string") return null;

  try {
    // 1. Format Base64 Data URL
    if (photo.startsWith("data:image/")) {
      const parts = photo.split(",");
      if (parts[1]) {
        return Buffer.from(parts[1], "base64");
      }
    }

    // 2. Format URL HTTP/HTTPS
    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      const resp = await axios.get(photo, { responseType: "arraybuffer", timeout: 6000 });
      return Buffer.from(resp.data);
    }

    // 3. File lokal di folder upload captures
    const filename = path.basename(photo);
    const candidatePaths = [
      photo,
      path.join(__dirname, "..", "mrc", "public", "uploads", "captures", filename),
      path.join(__dirname, "public", "uploads", "captures", filename),
      path.join(__dirname, "..", "public", "uploads", "captures", filename),
      path.join(process.cwd(), "mrc", "public", "uploads", "captures", filename),
      path.join(process.cwd(), "public", "uploads", "captures", filename),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    }

    // 4. Coba ambil dari Next.js lokal port 3554
    if (photo.startsWith("/")) {
      try {
        const localUrl = `http://127.0.0.1:3554${photo}`;
        const resp = await axios.get(localUrl, { responseType: "arraybuffer", timeout: 4000 });
        return Buffer.from(resp.data);
      } catch (errLocal) {
        // Abaikan jika tidak dapat dijangkau
      }
    }
  } catch (err) {
    console.error("⚠️ Gagal memuat buffer gambar untuk WA:", err.message);
  }

  return null;
}

app.post("/pinjam", async (req, res) => {
  try {
    const { number, name, start_date, due_date, items, id, purpose, notes, photo } = req.body;

    if (!number || !name || !start_date || !due_date || !Array.isArray(items) || !purpose) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    function formatStart(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} pukul ${hh}:${min}`;
      } catch {
        return tgl;
      }
    }

    function formatDue(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return tgl;
      }
    }

    const pinjamId =
      id || `PMJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const jid = number.includes("@s.whatsapp.net")
      ? number
      : number.replace(/\D/g, "") + "@s.whatsapp.net";

    const itemsText = items
      .map((it, idx) => `${idx + 1}. ${it.item_name} (${it.qty}x)`)
      .join("\n");

    const startDateText = formatStart(start_date);
    const dueDateText = formatDue(due_date);

    let notesText = notes && notes.trim() ? `📄 Catatan: *${notes}*\n` : "";
    const rawTemplate = await getDynamicTemplate("loan");
    const message = rawTemplate
      .replace(/{name}/g, name || "")
      .replace(/{items}/g, itemsText || "")
      .replace(/{startDate}/g, startDateText || "")
      .replace(/{dueDate}/g, dueDateText || "")
      .replace(/{purpose}/g, purpose || "-")
      .replace(/{notes}/g, notesText || "");

    pinjamanDB.push({
      id: pinjamId,
      number,
      name,
      start_date,
      due_date,
      items,
      purpose,
      notes: notes || "",
      photo: photo || null,
      status: "dipinjam",
      returned_at: null,
    });
    savePinjaman(pinjamanDB);

    ensureUserHistoryKey(jid);
    conversationHistory[jid].push({ role: "assistant", content: message });
    const system = conversationHistory[jid][0];
    const rest = conversationHistory[jid].slice(1).slice(-MAX_HISTORY_ITEMS);
    conversationHistory[jid] = [system, ...rest];
    saveHistory(conversationHistory);

    if (sockGlobal) {
      try {
        const imageBuf = await getImageBuffer(photo);
        if (imageBuf) {
          // Kirim gambar bukti serah terima dengan pesan sebagai caption
          if (message.length <= 1000) {
            await sockGlobal.sendMessage(jid, {
              image: imageBuf,
              caption: message,
            });
          } else {
            await sockGlobal.sendMessage(jid, {
              image: imageBuf,
              caption: "📸 *Foto Bukti Penyerahan Barang - MRC SMKN 1 Subang*",
            });
            await sockGlobal.sendMessage(jid, { text: message });
          }
          console.log(`[WA] ✅ Foto bukti dan pesan peminjaman terkirim ke ${number}`);
        } else {
          // Jika tanpa foto, kirim pesan teks biasa
          await sockGlobal.sendMessage(jid, { text: message });
          console.log(`[WA] ✅ Pesan teks peminjaman terkirim ke ${number}`);
        }
      } catch (e) {
        console.error("Gagal kirim WA message (/pinjam) dengan gambar:", e.message || e);
        // Fallback: coba kirim teks biasa jika pengiriman gambar gagal
        try {
          await sockGlobal.sendMessage(jid, { text: message });
        } catch (errFallback) {
          console.error("Fallback kirim teks WA juga gagal:", errFallback.message || errFallback);
        }
      }
    } else {
      console.warn("⚠️ sockGlobal belum terhubung, pesan WA tidak terkirim.");
    }


    res.json({
      status: "Pesan berhasil dikirim",
      sent_to: number,
      id: pinjamId,
    });
    console.log(
      `[${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      })}] ✅ Pesan pemberitahuan peminjaman dikirim ke ${number}`
    );
  } catch (err) {
    console.error("Error /pinjam:", err);
    res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

app.post("/kembali", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "ID peminjaman wajib diisi" });
    }
    const idx = pinjamanDB.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "ID peminjaman tidak ditemukan" });
    }
    if (pinjamanDB[idx].status === "dikembalikan") {
      return res
        .status(400)
        .json({ error: "Barang sudah dikembalikan sebelumnya" });
    }
    pinjamanDB[idx].status = "dikembalikan";
    pinjamanDB[idx].returned_at = new Date().toISOString();
    const { number, name, items, start_date, purpose, notes } = pinjamanDB[idx];
    const jid = number.includes("@s.whatsapp.net")
      ? number
      : number.replace(/\D/g, "") + "@s.whatsapp.net";
    const itemsText = items
      .map((it, idx) => `${idx + 1}. ${it.item_name} (${it.qty}x)`)
      .join("\n");
    // Hitung durasi peminjaman
    const startTime = new Date(pinjamanDB[idx].start_date).getTime();
    const returnedTime = new Date(pinjamanDB[idx].returned_at).getTime();
    let durationMs = returnedTime - startTime;
    if (durationMs < 0) durationMs = 0;
    let m = Math.floor(durationMs / 1000 / 60) % 60;
    let h = Math.floor(durationMs / 1000 / 60 / 60) % 24;
    let d = Math.floor(durationMs / 1000 / 60 / 60 / 24);
    let durasiStr;
    if (d === 0) {
      durasiStr = `${h} jam, ${m} menit`;
    } else {
      durasiStr = `${d} hari, ${h} jam, ${m} menit`;
    }

    const startDateText = (() => {
      try {
        const d = new Date(start_date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} pukul ${hh}:${min}`;
      } catch {
        return start_date;
      }
    })();
    let notesText = notes && notes.trim() ? `📄 Catatan: *${notes}*\n` : "";
    const rawTemplate = await getDynamicTemplate("return");
    const message = rawTemplate
      .replace(/{name}/g, name || "")
      .replace(/{items}/g, itemsText || "")
      .replace(/{startDate}/g, startDateText || "")
      .replace(/{purpose}/g, purpose || "-")
      .replace(/{notes}/g, notesText || "")
      .replace(/{duration}/g, durasiStr || "");

    try {
      if (sockGlobal) {
        await sockGlobal.sendMessage(jid, { text: message });
        ensureUserHistoryKey(jid);
        conversationHistory[jid].push({ role: "assistant", content: message });
        const system = conversationHistory[jid][0];
        const rest = conversationHistory[jid].slice(1).slice(-MAX_HISTORY_ITEMS);
        conversationHistory[jid] = [system, ...rest];
        saveHistory(conversationHistory);
      } else {
        console.warn("⚠️ sockGlobal belum terhubung, pesan pengembalian WA tidak terkirim.");
      }
    } catch (e) {
      console.error("Gagal kirim konfirmasi pengembalian:", e.message || e);
    }
    savePinjaman(pinjamanDB);
    res.json({ status: "Barang telah ditandai sebagai dikembalikan", id });
    console.log(
      `[${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      })}] ✅ Barang dengan ID ${id} telah dikembalikan.`
    );
  } catch (err) {
    console.error("Error /kembali:", err);
    res.status(500).json({ error: "Gagal menandai pengembalian" });
  }
});

app.post("/pengingat", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "ID peminjaman wajib diisi" });
    }
    const pinjaman = pinjamanDB.find((p) => p.id === id);
    if (!pinjaman) {
      return res.status(404).json({ error: "ID peminjaman tidak ditemukan" });
    }
    if (pinjaman.status === "dikembalikan") {
      return res.status(400).json({ error: "Barang sudah dikembalikan sebelumnya" });
    }
    const { number, name, items, start_date, due_date, purpose, notes } = pinjaman;
    const jid = number.includes("@s.whatsapp.net")
      ? number
      : number.replace(/\D/g, "") + "@s.whatsapp.net";
    const itemsText = items
      .map((it, idx) => `${idx + 1}. ${it.item_name} (${it.qty}x)`)
      .join("\n");
    function formatStart(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} pukul ${hh}:${min}`;
      } catch {
        return tgl;
      }
    }
    function formatDue(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return tgl;
      }
    }
    const startDateText = formatStart(start_date);
    const dueDateText = formatDue(due_date);
    let notesText = notes && notes.trim() ? `📄 Catatan: *${notes}*\n` : "";
    const rawTemplate = await getDynamicTemplate("reminder");
    const reminderMsg = rawTemplate
      .replace(/{name}/g, name || "")
      .replace(/{items}/g, itemsText || "")
      .replace(/{startDate}/g, startDateText || "")
      .replace(/{dueDate}/g, dueDateText || "")
      .replace(/{purpose}/g, purpose || "-")
      .replace(/{notes}/g, notesText || "");
    try {
      if (sockGlobal) {
        await sockGlobal.sendMessage(jid, { text: reminderMsg });
        ensureUserHistoryKey(jid);
        conversationHistory[jid].push({ role: "assistant", content: reminderMsg });
        const system = conversationHistory[jid][0];
        const rest = conversationHistory[jid].slice(1).slice(-MAX_HISTORY_ITEMS);
        conversationHistory[jid] = [system, ...rest];
        saveHistory(conversationHistory);
      } else {
        console.warn("⚠️ sockGlobal belum terhubung, pesan pengingat WA tidak terkirim.");
      }
      res.json({ status: "Pengingat berhasil dikirim", id });
      console.log(
        `[${new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })}] 🔔 Pengingat pengembalian dikirim ke ${number}`
      );
    } catch (e) {
      console.error("Gagal kirim pengingat:", e.message || e);
      res.status(500).json({ error: "Gagal mengirim pengingat" });
    }
  } catch (err) {
    console.error("Error /pengingat:", err);
    res.status(500).json({ error: "Gagal memproses pengingat" });
  }
});


// Endpoint untuk mengaktifkan/mematikan AI
app.post("/ai", (req, res) => {
  try {
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active harus boolean (true/false)" });
    }
    settings.ai_active = active;
    saveSettings(settings);
    res.json({ status: "AI status updated", ai_active: settings.ai_active });
    console.log(`AI status diubah menjadi: ${settings.ai_active ? "aktif" : "nonaktif"}`);
  } catch (err) {
    console.error("Error /ai:", err);
    res.status(500).json({ error: "Gagal update AI status" });
  }
});

// Endpoint untuk booking barang
app.post("/book", async (req, res) => {
  try {
    const { number, name, start_date, due_date, items, id, purpose, notes } = req.body;

    if (!number || !name || !start_date || !due_date || !Array.isArray(items) || !purpose) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    function formatStart(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} pukul ${hh}:${min}`;
      } catch {
        return tgl;
      }
    }

    function formatDue(tgl) {
      try {
        const d = new Date(tgl);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return tgl;
      }
    }

    const bookingId = id || `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const bookingsPath = path.join(__dirname, "bookings.json");
    let bookings = [];
    if (fs.existsSync(bookingsPath)) {
      try { bookings = JSON.parse(fs.readFileSync(bookingsPath, "utf8")); } catch { }
    }

    const bookingRecord = {
      id: bookingId,
      number,
      name,
      start_date,
      due_date,
      items,
      purpose,
      notes: notes || "",
      status: 0, // 0 = booking, 1 = aktif (peminjaman)
      created_at: new Date().toISOString()
    };
    bookings.push(bookingRecord);
    try {
      fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2));
    } catch (e) {
      return res.status(500).json({ error: "Gagal menyimpan booking" });
    }

    res.json({ status: "Booking berhasil disimpan", id: bookingId });
    console.log(
      `[${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      })}] ✅ Booking baru dicatat dengan ID ${bookingId}`
    );
  } catch (err) {
    console.error("Error /book:", err);
    res.status(500).json({ error: "Gagal memproses booking" });
  }
});

// ===== WhatsApp Dashboard API Endpoints =====

// GET /wa/status — status koneksi & QR
app.get("/wa/status", (req, res) => {
  res.json({
    status: waState.status,
    qrDataUrl: waState.qrDataUrl,
    uptime: Date.now() - BOT_START_TIME,
  });
});

// GET /wa/messages — pesan terbaru (dari memory + history.json)
app.get("/wa/messages", (req, res) => {
  try {
    // Combine in-memory recent messages with conversation history
    const historyMessages = [];
    for (const [jid, msgs] of Object.entries(conversationHistory)) {
      if (!jid.endsWith("@s.whatsapp.net")) continue;
      for (const m of msgs) {
        if (m.role === "system") continue;
        historyMessages.push({
          id: `hist-${jid}-${historyMessages.length}`,
          from: jid,
          pushName: "",
          text: m.content,
          timestamp: 0,
          fromMe: m.role === "assistant",
        });
      }
    }
    // Return in-memory recent messages (these have real timestamps)
    res.json({
      messages: waState.recentMessages,
      history: historyMessages,
    });
  } catch (err) {
    console.error("Error /wa/messages:", err);
    res.status(500).json({ error: "Gagal mengambil pesan" });
  }
});

// POST /wa/send — kirim pesan dari web dashboard
app.post("/wa/send", async (req, res) => {
  try {
    const { jid, text } = req.body;
    if (!jid || !text) {
      return res.status(400).json({ error: "jid dan text wajib diisi" });
    }
    if (!sockGlobal) {
      return res.status(503).json({ error: "WhatsApp belum terhubung" });
    }
    const targetJid = jid.includes("@s.whatsapp.net")
      ? jid
      : jid.replace(/\D/g, "") + "@s.whatsapp.net";

    await sockGlobal.sendMessage(targetJid, { text });

    // Track sent message
    waState.recentMessages.push({
      id: "web-" + Date.now(),
      from: targetJid,
      pushName: "MRC Bot",
      text: text,
      timestamp: Math.floor(Date.now() / 1000),
      fromMe: true,
    });
    if (waState.recentMessages.length > MAX_RECENT_MESSAGES) {
      waState.recentMessages = waState.recentMessages.slice(-MAX_RECENT_MESSAGES);
    }

    // Also add to conversation history
    ensureUserHistoryKey(targetJid);
    conversationHistory[targetJid].push({ role: "assistant", content: text });
    const system = conversationHistory[targetJid][0];
    const rest = conversationHistory[targetJid].slice(1).slice(-MAX_HISTORY_ITEMS);
    conversationHistory[targetJid] = [system, ...rest];
    saveHistory(conversationHistory);

    res.json({ status: "Pesan berhasil dikirim", to: targetJid });
  } catch (err) {
    console.error("Error /wa/send:", err);
    res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

// POST /wa/logout — logout WhatsApp, hapus auth_info
app.post("/wa/logout", async (req, res) => {
  try {
    if (sockGlobal) {
      try {
        await sockGlobal.logout();
      } catch (e) {
        console.warn("Logout error (ignored):", e.message);
      }
    }
    // Force delete auth_info
    const authDir = path.join(__dirname, "auth_info");
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log("✅ Folder auth_info berhasil dihapus via /wa/logout.");
      }
    } catch (e) {
      console.error("Gagal hapus auth_info:", e.message);
    }
    waState.status = "disconnected";
    waState.qrDataUrl = null;
    // Restart bot to generate new QR
    setTimeout(() => startBot(), 2000);
    res.json({ status: "Logged out, auth_info deleted" });
  } catch (err) {
    console.error("Error /wa/logout:", err);
    res.status(500).json({ error: "Gagal logout" });
  }
});

const PORT = process.env.PORT || 3445;
app.listen(PORT, () => {
  console.log(`🚀 Server API Bot MRC berjalan di port ${PORT}`);
});

startBot().catch((err) => console.error("Start bot error:", err));