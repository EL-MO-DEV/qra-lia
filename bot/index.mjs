// Qra Lia — WhatsApp PROTOTYPE on a personal number (unofficial, Baileys).
// ⚠️ Not the official WhatsApp API: the number can be banned. Use a spare SIM, few testers, prototype only.
// Runs on a PC or small server (needs to stay on). It calls the live Qra Lia API for reading + voice.
//
//   cd bot && npm install && npm start      → scan the QR with WhatsApp (Linked devices)
//
// Env (optional):
//   API_BASE=https://qra-lia.vercel.app     where /api/read and /api/tts live
//   ALLOWED_NUMBERS=2126XXXXXXXX,2126YYYYYYYY   testers who can use the bot without the start word
//   QR_PASSWORD=…        enables the web page /qr?key=… to scan the QR when running on a server
//   AUTH_DIR=auth        where the login session is kept (a persistent volume on a server)
//   PORT=3000            web port (set automatically by most hosts)
import { Boom } from "@hapi/boom";
import makeWASocket, { DisconnectReason, downloadMediaMessage, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Mp3Encoder } from "@breezystack/lamejs";
import pino from "pino";
import { createServer } from "node:http";
import QRCode from "qrcode";
import qrcode from "qrcode-terminal";

const API_BASE = (process.env.API_BASE || "https://qra-lia.vercel.app").replace(/\/$/, "");
const ALLOWED = new Set((process.env.ALLOWED_NUMBERS || "").split(",").map((n) => n.replace(/\D/g, "")).filter(Boolean));
const START_WORDS = /(qra\s*lia|اقرا\s*ليا|قرا\s*ليا)/i;
const SESSION_MS = 30 * 60_000; // after the start word, the person can send papers for 30 min
const MAX_READS = 5; // per person per 10 minutes
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const AUTH_DIR = process.env.AUTH_DIR || "auth";
const QR_PASSWORD = process.env.QR_PASSWORD || "";

// Live status for the small web page (needed on a server, where nobody sees the terminal).
const status = { connected: false, qr: "", since: new Date().toISOString() };

const TEXT = {
  welcome:
    "مرحبا بيك فـ Qra Lia 👋\nصيفط ليا *تصويرة ديال الورقة* (فاتورة، رسالة ديال البنكة، CNSS، الإدارة، ولا SMS مشكوك فيه) ونشرحها ليك بالدارجة، بالكتابة وبالصوت.\n\n🔒 التصويرة ما كتحفظش.\n🧪 هادي نسخة تجريبية.",
  reading: "⏳ كنقرا الورقة… شي ثواني.",
  tooBig: "التصويرة كبيرة بزاف، صيفطها عادية 📸",
  tooMany: "بزاف ديال الأوراق دابا 🙏 تسنى شي دقايق وعاود.",
  failed: "ما قدرناش نقراو الورقة دابا. عاود صيفطها من بعد شوية 🙏",
  safety: "⚠️ إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.",
};

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
const sessions = new Map(); // person → session end time
const reads = new Map(); // person → timestamps of recent reads

const digits = (jid = "") => jid.split("@")[0].split(":")[0].replace(/\D/g, "");

function formatResult(r) {
  const lines = [];
  if (r.scam_suspected) lines.push("🚨 *رد البال! هادي فيها علامات ديال النصب.* ما تصيفط حتى كود وما تكليكيش على الروابط.\n");
  const what = [r.doc_type, r.sender].filter(Boolean).join(" — ");
  if (what) lines.push(`📄 ${what}`);
  if (r.amount) lines.push(`💰 ${r.amount.value} ${["MAD", "DH", "DHS"].includes(String(r.amount.currency).toUpperCase()) ? "درهم" : r.amount.currency}`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.deadline || "");
  if (m) lines.push(`📅 قبل ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}${r.days_left !== null ? ` (بقاو ${r.days_left} يوم)` : ""}`);
  if (r.action) lines.push(`✅ ${r.action}`);
  return `${lines.join("\n")}\n\n${r.darija_summary}\n\n${TEXT.safety}`;
}

function wavToMp3(wav) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  let rate = 16_000;
  while (offset + 8 <= wav.byteLength) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") rate = view.getUint32(offset + 12, true);
    if (id === "data") {
      const data = wav.slice(offset + 8, Math.min(offset + 8 + size, wav.byteLength));
      const pcm = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
      const enc = new Mp3Encoder(1, rate, 48);
      const parts = [];
      for (let i = 0; i < pcm.length; i += 1152 * 20) parts.push(Buffer.from(enc.encodeBuffer(pcm.subarray(i, i + 1152 * 20))));
      parts.push(Buffer.from(enc.flush()));
      return Buffer.concat(parts);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("wav: no data chunk");
}

function allowed(person) {
  const now = Date.now();
  const recent = (reads.get(person) || []).filter((t) => t > now - 10 * 60_000);
  if (recent.length >= MAX_READS) return false;
  recent.push(now);
  reads.set(person, recent);
  return true;
}

async function readPaper(sock, chat, person, msg) {
  if (!allowed(person)) return sock.sendMessage(chat, { text: TEXT.tooMany });
  await sock.sendMessage(chat, { text: TEXT.reading });
  await sock.sendPresenceUpdate("composing", chat);

  const image = await downloadMediaMessage(msg, "buffer", {});
  if (image.length > MAX_IMAGE_BYTES) return sock.sendMessage(chat, { text: TEXT.tooBig });
  const mimeType = msg.message?.imageMessage?.mimetype?.split(";")[0] || "image/jpeg";

  const res = await fetch(`${API_BASE}/api/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({ imageBase64: image.toString("base64"), mimeType: ["image/jpeg", "image/png", "image/webp"].includes(mimeType) ? mimeType : "image/jpeg", lang: "ar" }),
  });
  if (!res.ok) throw new Error(`read http ${res.status}`);
  const r = await res.json();
  console.log(new Date().toISOString(), "read", r.status, r.provider, r.risk_level); // never log the content

  if (r.status !== "ok") return sock.sendMessage(chat, { text: `📸 ${r.darija_summary}` }, { quoted: msg });
  await sock.sendMessage(chat, { text: formatResult(r) }, { quoted: msg });

  // Voice note (best effort: the text already arrived)
  await sock.sendPresenceUpdate("recording", chat);
  const spoken = [r.scam_suspected ? "رد البال! هاد الورقة فيها علامات ديال النصب." : "", r.darija_summary].filter(Boolean).join(" ").slice(0, 800);
  const tts = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ text: spoken, lang: "ar" }),
  }).catch(() => null);
  if (tts?.ok) await sock.sendMessage(chat, { audio: wavToMp3(new Uint8Array(await tts.arrayBuffer())), mimetype: "audio/mpeg" });
  await sock.sendPresenceUpdate("paused", chat);
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR); // ⚠️ login session: never commit or share this folder
  const sock = makeWASocket({ auth: state, logger: pino({ level: process.env.LOG_LEVEL || "warn" }) });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      status.qr = qr;
      status.connected = false;
      console.log("\n📱 WhatsApp → ⋮ → Appareils connectés → Connecter un appareil → scan:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      status.connected = true;
      status.qr = "";
    }
    if (connection === "close") status.connected = false;
    if (connection === "open") console.log("✅ Qra Lia bot connected. Testers:", ALLOWED.size ? [...ALLOWED].join(", ") : "anyone who sends the start word");
    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) console.log("❌ Logged out. Delete the bot/auth folder and start again to scan a new QR.");
      else setTimeout(start, 3000); // network hiccup: reconnect
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      const chat = msg.key.remoteJid || "";
      if (msg.key.fromMe || !chat || chat.endsWith("@g.us") || chat === "status@broadcast" || chat.endsWith("@newsletter")) continue;

      // Phone number may come as an alternate JID when WhatsApp uses private ids (@lid).
      const person = digits(msg.key.remoteJidAlt || msg.key.senderPn || chat);
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
      const isImage = Boolean(msg.message?.imageMessage);
      const tester = ALLOWED.has(person);
      const inSession = (sessions.get(person) || 0) > Date.now();

      try {
        if (START_WORDS.test(text)) {
          sessions.set(person, Date.now() + SESSION_MS);
          if (!isImage) {
            await sock.sendMessage(chat, { text: TEXT.welcome });
            continue;
          }
        }
        // Personal number: friends' normal messages are left alone. Only testers or active sessions.
        if (isImage && (tester || inSession || START_WORDS.test(text))) {
          sessions.set(person, Date.now() + SESSION_MS);
          await readPaper(sock, chat, person, msg);
        }
      } catch (e) {
        console.warn("error:", e?.message?.slice(0, 160));
        await sock.sendMessage(chat, { text: TEXT.failed }).catch(() => {});
      }
    }
  });
}

// Web page: /health for the host, /qr?key=QR_PASSWORD to scan the login QR from a phone or laptop.
const page = (body) =>
  `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>Qra Lia bot</title><style>body{font-family:system-ui,sans-serif;background:#f5f7ff;color:#0b1533;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px}main{background:#fff;border-radius:24px;padding:28px;box-shadow:0 10px 30px #1d3fd822;max-width:420px}img{width:280px;height:280px}</style></head><body><main>${body}</main></body></html>`;

createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ connected: status.connected }));
  }
  if (url.pathname === "/qr" && QR_PASSWORD && url.searchParams.get("key") === QR_PASSWORD) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    if (status.connected) return res.end(page("<h1>✅ البوت متصل</h1><p>Qra Lia bot is connected.</p>"));
    if (!status.qr) return res.end(page("<h1>⏳ كنتسناو الـ QR…</h1><p>Waiting for WhatsApp, the page refreshes by itself.</p>"));
    const img = await QRCode.toDataURL(status.qr, { width: 560, margin: 1 });
    return res.end(page(`<h1>سكاني بواتساب</h1><p>WhatsApp → ⋮ → Appareils connectés → Connecter un appareil</p><img src="${img}" alt="QR"><p>كيتبدل كل شوية، الصفحة كتجدد راسها.</p>`));
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(`<h1>Qra Lia bot</h1><p>${status.connected ? "✅ connected" : "⏳ not connected"}</p>`));
}).listen(Number(process.env.PORT) || 3000, () => console.log(`🌐 status page on port ${Number(process.env.PORT) || 3000}`));

start();
