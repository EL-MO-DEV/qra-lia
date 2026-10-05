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
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import qrcode from "qrcode-terminal";
import sharp from "sharp";

const API_BASE = (process.env.API_BASE || "https://qra-lia.vercel.app").replace(/\/$/, "");
const ALLOWED = new Set((process.env.ALLOWED_NUMBERS || "").split(",").map((n) => n.replace(/\D/g, "")).filter(Boolean));
const START_WORDS = /(qra\s*lia|اقرا\s*ليا|قرا\s*ليا)/i;
const SESSION_MS = 30 * 60_000; // after the start word, the person can send papers for 30 min
const MAX_READS = 5; // per person per 10 minutes
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const AUTH_DIR = process.env.AUTH_DIR || "auth";
const QR_PASSWORD = process.env.QR_PASSWORD || "";

const REMINDERS_FILE = process.env.REMINDERS_FILE || path.join(path.dirname(path.resolve(AUTH_DIR)), "qra-reminders.json");
const CONVERSATION_MS = 30 * 60_000; // questions about the last paper are accepted for 30 min
const YES = /^(ايه|اييه|اه|آه|نعم|واخا|وخا|ok|okay|oui|yes|wah|iyeh|ah|eh|👍)(?=[\s!.,؟?]|$)/iu;
const NO = /^(لا|لالا|no|non|la|lla|👎)(?=[\s!.,؟?]|$)/iu;
const STOP = /(لغي|حبس|وقف التذكير|stop)/i;
const WHERE = /(وريني|ورّيني|فين مكتوب|werr?ini|warini|wrini)|^\s*(فين|fin)\s*[؟?]?\s*$/i;
// Whole words only: "دوا" must not match دوار، الدوام، دواير…
const MEDS_WORDS = /(?<!\p{L})(?:ال)?(?:دوا|دواء|ادوية|أدوية|وصفة)(?!\p{L})|\b(?:ordonnance|m[ée]dicaments?|dwa)\b/iu;
const MEDICAL_DOC = /(?<!\p{L})(?:ال)?(?:دوا|دواء|ادوية|أدوية|وصفة)(?!\p{L})|صيدل|\b(?:ordonnance|prescription|m[ée]dicaments?|pharmac\w*)\b/iu;
const SLOT_INFO = {
  morning: { label: "الصباح", emoji: "🌅", h: 8 },
  noon: { label: "الغدا", emoji: "☀️", h: 13 },
  evening: { label: "العشية", emoji: "🌆", h: 20 },
  night: { label: "قبل النعاس", emoji: "🌙", h: 22 },
};
const FOOD = { before: "قبل الماكلة", after: "من بعد الماكلة", with: "مع الماكلة" };
const NUM_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
const MEDS_SAFETY = "❤️ هادشي غير اللي مكتوب فالورقة. ما تبدلش الدوا وما توقفوش بلا ما تسول الطبيب ولا الصيدلي.";
const BOX_COLORS = { amount: "#00A884", deadline: "#F5A524", sender: "#3B82F6" };

// Live status for the small web page (needed on a server, where nobody sees the terminal).
const status = { connected: false, qr: "", since: new Date().toISOString() };

const TEXT = {
  welcome:
    "مرحبا بيك فـ Qra Lia 👋\nصيفط ليا *تصويرة ديال الورقة* (فاتورة، رسالة ديال البنكة، CNSS، الإدارة، ولا SMS مشكوك فيه) ونشرحها ليك بالدارجة، بالكتابة وبالصوت.\n🎤 من بعد تقدر تسولني على الورقة بڤوكال ولا بالكتابة.\n📍 ونوريك فين مكتوب المبلغ والأجل فالتصويرة.\n⏰ ونقدر نفكرك قبل الأجل.\n💊 وللدوا: كتب *دوا* ومن بعد صيفط تصويرة الوصفة ولا العلبة، ونقولو ليك شنو تاخد وفوقاش.\n\n🔒 التصويرة ما كتحفظش: qra-lia.vercel.app/privacy\n🧪 هادي نسخة تجريبية.",
  reading: "⏳ كنقرا الورقة… شي ثواني.",
  tooBig: "التصويرة كبيرة بزاف، صيفطها عادية 📸",
  tooMany: "بزاف ديال الأوراق دابا 🙏 تسنى شي دقايق وعاود.",
  failed: "ما قدرناش نقراو الورقة دابا. عاود صيفطها من بعد شوية 🙏",
  safety: "⚠️ إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.",
};

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
const sessions = new Map(); // person → session end time
const reads = new Map(); // person → timestamps of recent reads
const lastPaper = new Map(); // person → { result, until } — context for follow-up questions (memory only)
const reminderOffers = new Map(); // person → { kind: "paper" | "meds", chat, result, until } — waiting for "yes" / "no"
const medsMode = new Map(); // person → until: the next photo is a prescription / medicine box
let reminders = []; // [{ id, chat, at, text, spoken }] — saved on the volume, deleted once sent
let currentSock = null;

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

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

// Morocco is UTC+1 most of the year but UTC+0 during Ramadan: always go through the real time zone.
const CASA = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function casaParts(ts) {
  const p = Object.fromEntries(CASA.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month) - 1, d: Number(p.day), h: Number(p.hour), min: Number(p.minute) };
}
/** Timestamp of a Morocco wall-clock time (day overflow allowed, like Date.UTC). */
function casaTime(y, m, d, h, min = 0) {
  const guess = Date.UTC(y, m, d, h, min);
  const p = casaParts(guess);
  return guess - (Date.UTC(p.y, p.m, p.d, p.h, p.min) - guess);
}

async function loadReminders() {
  try {
    reminders = JSON.parse(await readFile(REMINDERS_FILE, "utf8"));
  } catch {
    reminders = [];
  }
}

async function saveReminders() {
  const tmp = `${REMINDERS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(reminders));
  await rename(tmp, REMINDERS_FILE);
}

/** Text → voice note (MP3) through the live /api/tts. Null when the voice is unavailable. */
async function voiceNote(text) {
  const tts = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ text: text.slice(0, 800), lang: "ar" }),
  }).catch(() => null);
  return tts?.ok ? wavToMp3(new Uint8Array(await tts.arrayBuffer())) : null;
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
  // A prescription / medicine box: the medicine schedule is far more useful than a "paper" explanation.
  if (MEDICAL_DOC.test(`${r.doc_type || ""} ${r.sender || ""}`)) {
    try {
      if (await readMedsFlow(sock, chat, person, msg, image)) return;
    } catch (e) {
      // Medicine reader unavailable: fall back to the explanation we already have.
      console.warn("meds fallback:", e?.message?.slice(0, 120));
    }
  }
  await sock.sendMessage(chat, { text: formatResult(r) }, { quoted: msg });

  // The photo stays in memory only, for 30 min, so "وريني" can show where things are written.
  lastPaper.set(person, { result: r, image, until: Date.now() + CONVERSATION_MS });

  // Voice note (best effort: the text already arrived)
  await sock.sendPresenceUpdate("recording", chat);
  const spoken = [r.scam_suspected ? "رد البال! هاد الورقة فيها علامات ديال النصب." : "", r.darija_summary].filter(Boolean).join(" ");
  const mp3 = await voiceNote(spoken);
  if (mp3) await sock.sendMessage(chat, { audio: mp3, mimetype: "audio/mpeg" });
  await sock.sendPresenceUpdate("paused", chat);

  // Offer a reminder when there is a deadline at least 2 days away.
  const next = ["🎤 عندك سؤال على هاد الورقة؟ صيفط ليا ڤوكال ولا كتب."];
  if (r.amount || r.deadline || r.sender) next.unshift("📍 كتب *وريني* باش نوريك فين مكتوب المبلغ والأجل فالورقة ديالك.");
  if (r.deadline && typeof r.days_left === "number" && r.days_left >= 2 && !r.scam_suspected) {
    reminderOffers.set(person, { kind: "paper", chat, result: r, until: Date.now() + CONVERSATION_MS });
    next.unshift(`⏰ بغيتي نفكرك يوماين قبل ${formatDate(r.deadline)}؟ جاوب *ايه* ولا *لا*.`);
  }
  await sock.sendMessage(chat, { text: next.join("\n\n") });
}

async function addReminder(sock, chat, person, r) {
  const [y, m, d] = r.deadline.split("-").map(Number);
  const at = Math.max(casaTime(y, m - 1, d - 2, 10), Date.now() + 60_000); // 10:00 Morocco time
  const amount = r.amount ? `${r.amount.value} درهم` : "";
  const what = [r.doc_type, r.sender].filter(Boolean).join(" — ");
  const text = ["⏰ *تذكير من Qra Lia*", what && `📄 ${what}`, amount && `💰 ${amount}`, `📅 الأجل: ${formatDate(r.deadline)}`, r.action && `✅ ${r.action}`]
    .filter(Boolean)
    .join("\n");
  const spoken = `تذكير من اقرا ليا. ${what}. ${amount ? `خاصك تخلّص ${amount}. ` : ""}الأجل هو ${formatDate(r.deadline)}. ${r.action || ""}`;
  reminders.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, chat, at, text, spoken });
  await saveReminders();
  const when = casaParts(at);
  await sock.sendMessage(chat, {
    text: `✅ واخا! غادي نفكرك نهار ${when.d} ${MONTHS[when.m]} فالصباح.\nإلا بغيتي تلغي التذكير كتب *لغي*.`,
  });
}

async function sendDueReminders() {
  if (!currentSock || !status.connected) return;
  const now = Date.now();
  const due = reminders.filter((x) => x.at <= now);
  if (!due.length) return;
  for (const x of due) {
    try {
      await currentSock.sendMessage(x.chat, { text: x.text });
      const mp3 = await voiceNote(x.spoken);
      if (mp3) await currentSock.sendMessage(x.chat, { audio: mp3, mimetype: "audio/mpeg" });
      console.log(new Date().toISOString(), "reminder sent");
    } catch (e) {
      console.warn("reminder error:", e?.message?.slice(0, 120));
    }
  }
  reminders = reminders.filter((x) => !due.includes(x));
  await saveReminders();
}

/** Medicine schedule text: each medicine, then the day by time of day, then the safety line. */
function formatMeds(m) {
  const lines = ["💊 *الدوا ديالك* (هادشي اللي مكتوب فالورقة)", ""];
  m.medicines.forEach((med, i) => {
    lines.push(`${NUM_EMOJI[i] || `${i + 1}.`} *${med.name}*${med.dose ? ` — ${med.dose}` : ""}`);
    const facts = [
      ...med.slots.map((s) => `${SLOT_INFO[s].emoji} ${SLOT_INFO[s].label}`),
      med.slots.length ? null : "غير إلا احتاجيتي",
      med.food ? FOOD[med.food] : null,
      med.duration_days ? `${med.duration_days} أيام` : null,
    ].filter(Boolean);
    if (facts.length) lines.push(`    ${facts.join(" · ")}`);
    if (med.note) lines.push(`    📝 ${med.note}`);
  });
  const day = Object.keys(SLOT_INFO)
    .map((slot) => ({ slot, meds: m.medicines.filter((x) => x.slots.includes(slot)) }))
    .filter((g) => g.meds.length);
  if (day.length) {
    lines.push("", "🗓️ *النهار ديالك:*");
    for (const { slot, meds } of day) lines.push(`${SLOT_INFO[slot].emoji} ${SLOT_INFO[slot].label} (${SLOT_INFO[slot].h}:00): ${meds.map((x) => x.name).join("، ")}`);
  }
  if (m.warnings?.length) lines.push("", ...m.warnings.map((w) => `⚠️ ${w}`));
  if (m.confidence < 0.6) lines.push("", "🟠 ما متأكدينش مزيان من هاد القراية: وري الورقة للصيدلي.");
  lines.push("", MEDS_SAFETY);
  return lines.join("\n");
}

/** Prescription / medicine box → schedule (text + voice) + offer daily reminders. False if it isn't medical. */
async function readMedsFlow(sock, chat, person, msg, image) {
  const direct = !image;
  if (direct) {
    if (!allowed(person)) return sock.sendMessage(chat, { text: TEXT.tooMany });
    await sock.sendMessage(chat, { text: "⏳ كنقرا الدوا… شي ثواني." });
    image = await downloadMediaMessage(msg, "buffer", {});
    if (image.length > MAX_IMAGE_BYTES) return sock.sendMessage(chat, { text: TEXT.tooBig });
  }
  await sock.sendPresenceUpdate("composing", chat);
  const { data: photo } = await sharp(image).rotate().jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const res = await fetch(`${API_BASE}/api/meds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({ imageBase64: photo.toString("base64"), mimeType: "image/jpeg", lang: "ar" }),
  });
  if (!res.ok) throw new Error(`meds http ${res.status}`);
  const m = await res.json();
  console.log(new Date().toISOString(), "meds", m.status, m.medicines?.length ?? 0, m.provider); // never log medicine names
  if (m.status !== "ok" || !m.medicines?.length) {
    if (!direct) return false; // not a prescription after all: the caller shows the normal explanation
    const why = m.status === "unreadable" ? "📸 الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون." : "هادي ما باناتش وصفة ولا دوا. صوّر الورقة ديال الطبيب ولا العلبة ديال الدوا.";
    await sock.sendMessage(chat, { text: why });
    return true;
  }
  medsMode.delete(person);
  await sock.sendMessage(chat, { text: formatMeds(m) }, { quoted: msg });

  // Follow-up questions are answered from the schedule only (no photo kept for medicines).
  const scheduleText = m.medicines.map((x) => `${x.name}${x.dose ? ` ${x.dose}` : ""}: ${x.slots.map((s) => SLOT_INFO[s].label).join("، ") || "غير إلا احتاجيتي"}${x.food ? `، ${FOOD[x.food]}` : ""}${x.duration_days ? `، ${x.duration_days} أيام` : ""}${x.note ? ` (${x.note})` : ""}`).join(". ");
  lastPaper.set(person, { result: { doc_type: "وصفة ديال الدوا", darija_summary: `${scheduleText}. ${m.summary}`.slice(0, 3000), risk_reasons: m.warnings }, until: Date.now() + CONVERSATION_MS });

  await sock.sendPresenceUpdate("recording", chat);
  const day = Object.keys(SLOT_INFO).map((slot) => ({ slot, meds: m.medicines.filter((x) => x.slots.includes(slot)) })).filter((g) => g.meds.length);
  const spokenDay = day.map(({ slot, meds }) => `${SLOT_INFO[slot].label}: ${meds.map((x) => [x.dose, x.name].filter(Boolean).join(" ")).join("، و ")}.`).join(" ");
  const mp3 = await voiceNote([spokenDay, m.summary].filter(Boolean).join(" "));
  if (mp3) await sock.sendMessage(chat, { audio: mp3, mimetype: "audio/mpeg" });
  await sock.sendPresenceUpdate("paused", chat);

  const next = ["🎤 عندك سؤال على هاد الدوا؟ صيفط ڤوكال ولا كتب (كنجاوب غير من اللي مكتوب فالورقة)."];
  if (day.length) {
    reminderOffers.set(person, { kind: "meds", chat, result: m, until: Date.now() + CONVERSATION_MS });
    next.unshift(`⏰ بغيتي نفكرك كل نهار فوقت الدوا (${day.map(({ slot }) => `${SLOT_INFO[slot].h}:00`).join("، ")})؟ جاوب *ايه* ولا *لا*.`);
  }
  await sock.sendMessage(chat, { text: next.join("\n\n") });
  return true;
}

/** Daily reminders at each medicine time (Morocco wall-clock time), for the written duration (default 7, max 30 days). */
async function addMedReminders(sock, chat, m) {
  const now = Date.now();
  const { y, m: mo, d } = casaParts(now); // today in Morocco
  const summary = [];
  for (const [slot, info] of Object.entries(SLOT_INFO)) {
    const meds = m.medicines.filter((x) => x.slots.includes(slot));
    if (!meds.length) continue;
    const days = Math.min(30, Math.max(0, ...meds.map((x) => x.duration_days || 0)) || 7);
    const text = [
      `💊 *وقت الدوا — ${info.label} (${info.h}:00)*`,
      ...meds.map((x) => `• ${x.name}${x.dose ? ` — ${x.dose}` : ""}${x.food ? ` (${FOOD[x.food]})` : ""}`),
      "",
      "❤️ إلا عندك شك، سول الصيدلي.",
    ].join("\n");
    const spoken = `وقت الدوا ديال ${info.label}. ${meds.map((x) => [x.dose, x.name].filter(Boolean).join(" ")).join("، و ")}.`;
    let added = 0;
    for (let i = 0; added < days && i < days + 1; i++) {
      const at = casaTime(y, mo, d + i, info.h);
      if (at <= now + 60_000) continue;
      reminders.push({ id: `${slot}-${at}-${Math.random().toString(36).slice(2, 7)}`, chat, at, text, spoken });
      added++;
    }
    summary.push(`${info.emoji} ${info.label} ${info.h}:00 (${added} أيام)`);
  }
  await saveReminders();
  await sock.sendMessage(chat, { text: `✅ واخا! غادي نفكرك كل نهار:\n${summary.join("\n")}\n\nكتب *لغي* باش توقف التذكيرات.` });
}

/** "وريني": draw coloured boxes on the user's own photo where the amount, deadline and sender are printed. */
async function showWhere(sock, chat, person, msg) {
  const paper = lastPaper.get(person);
  if (!paper || paper.until < Date.now() || !paper.image) return false;
  const r = paper.result;
  const targets = {
    ...(r.amount ? { amount: `${r.amount.value} ${r.amount.currency}` } : {}),
    ...(r.deadline ? { deadline: r.deadline } : {}),
    ...(r.sender ? { sender: r.sender } : {}),
  };
  if (!Object.keys(targets).length) {
    await sock.sendMessage(chat, { text: "هاد الورقة ما فيهاش مبلغ ولا أجل باش نوريك فين." });
    return true;
  }
  await sock.sendPresenceUpdate("composing", chat);
  // Same pixels for the AI and for the drawing (EXIF rotation applied once).
  const { data: photo, info } = await sharp(paper.image).rotate().jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const res = await fetch(`${API_BASE}/api/locate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({ imageBase64: photo.toString("base64"), mimeType: "image/jpeg", width: info.width, height: info.height, targets }),
  });
  if (!res.ok) throw new Error(`locate http ${res.status}`);
  const { boxes } = await res.json();
  console.log(new Date().toISOString(), "located", boxes.map((b) => b.field).join(","));
  if (!boxes.length) {
    await sock.sendMessage(chat, { text: "ما لقيتش فين مكتوب بالضبط 🙏 شوف الورقة الأصلية ولا سول شي حد تيق فيه." });
    return true;
  }
  const { width: W, height: H } = info;
  const stroke = Math.max(4, Math.round(Math.min(W, H) / 120));
  const pad = stroke * 2;
  const rects = boxes
    .map((b) => {
      const x = Math.max(0, b.x * W - pad);
      const y = Math.max(0, b.y * H - pad);
      const w = Math.min(W - x, b.w * W + pad * 2);
      const h = Math.min(H - y, b.h * H + pad * 2);
      const c = BOX_COLORS[b.field] || "#00A884";
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${stroke * 2}" fill="${c}" fill-opacity="0.15" stroke="#fff" stroke-width="${stroke * 2.6}"/>` +
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${stroke * 2}" fill="none" stroke="${c}" stroke-width="${stroke}"/>`;
    })
    .join("");
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}</svg>`);
  const drawn = await sharp(photo).composite([{ input: overlay }]).jpeg({ quality: 85 }).toBuffer();
  const amount = r.amount ? `${r.amount.value} درهم` : "";
  const legend = {
    amount: `🟩 المبلغ: ${amount}`,
    deadline: `🟧 الأجل: ${formatDate(r.deadline)}`,
    sender: `🟦 شكون صيفطها: ${r.sender || ""}`,
  };
  const caption = ["📍 *هاهوما فين مكتوبين فالورقة ديالك:*", ...boxes.map((b) => legend[b.field])].join("\n");
  await sock.sendMessage(chat, { image: drawn, caption }, { quoted: msg });
  paper.until = Date.now() + CONVERSATION_MS;
  return true;
}

async function answer(sock, chat, person, question, msg) {
  const paper = lastPaper.get(person);
  if (!paper || paper.until < Date.now()) return false;
  await sock.sendPresenceUpdate("composing", chat);
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ question, context: paper.result, lang: "ar" }),
  });
  if (!res.ok) throw new Error(`ask http ${res.status}`);
  const { answer: reply } = await res.json();
  paper.until = Date.now() + CONVERSATION_MS;
  console.log(new Date().toISOString(), "question answered"); // never log the question
  await sock.sendMessage(chat, { text: `💬 ${reply}` }, { quoted: msg });
  await sock.sendPresenceUpdate("recording", chat);
  const mp3 = await voiceNote(reply);
  if (mp3) await sock.sendMessage(chat, { audio: mp3, mimetype: "audio/mpeg" });
  await sock.sendPresenceUpdate("paused", chat);
  return true;
}

async function transcribe(msg) {
  const audio = await downloadMediaMessage(msg, "buffer", {});
  const mimeType = msg.message?.audioMessage?.mimetype?.split(";")[0] || "audio/ogg";
  const res = await fetch(`${API_BASE}/api/stt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ audioBase64: audio.toString("base64"), mimeType, lang: "ar" }),
  });
  if (!res.ok) throw new Error(`stt http ${res.status}`);
  return String((await res.json()).text || "").trim();
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR); // ⚠️ login session: never commit or share this folder
  const sock = makeWASocket({ auth: state, logger: pino({ level: process.env.LOG_LEVEL || "warn" }) });
  currentSock = sock;
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
      const isVoice = Boolean(msg.message?.audioMessage);
      const tester = ALLOWED.has(person);
      const inSession = (sessions.get(person) || 0) > Date.now();
      const offer = reminderOffers.get(person);

      try {
        // Reminder offer: "ايه" / "لا"
        if (offer && offer.until > Date.now() && text && (YES.test(text.trim()) || NO.test(text.trim()))) {
          reminderOffers.delete(person);
          if (YES.test(text.trim())) {
            if (offer.kind === "meds") await addMedReminders(sock, chat, offer.result);
            else await addReminder(sock, chat, person, offer.result);
          }
          else await sock.sendMessage(chat, { text: "مزيان 👍" });
          continue;
        }
        if (text && STOP.test(text) && (tester || inSession)) {
          const before = reminders.length;
          reminders = reminders.filter((x) => x.chat !== chat);
          if (before !== reminders.length) await saveReminders();
          await sock.sendMessage(chat, { text: before !== reminders.length ? "✅ تلغاو التذكيرات ديالك." : "ما عندك حتى تذكير." });
          continue;
        }
        // "دوا": the next photo is a prescription / medicine box (short message, or no paper in progress)
        if (text && !isImage && MEDS_WORDS.test(text) && (tester || inSession || START_WORDS.test(text)) &&
            (text.trim().split(/\s+/).length <= 3 || !(lastPaper.get(person)?.until > Date.now()))) {
          sessions.set(person, Date.now() + SESSION_MS);
          medsMode.set(person, Date.now() + 10 * 60_000);
          await sock.sendMessage(chat, { text: "💊 صيفط ليا تصويرة ديال *الوصفة ديال الطبيب* ولا *العلبة ديال الدوا*، واضحة وفضو مزيان." });
          continue;
        }
        // "وريني": show where the amount / deadline / sender are written on the photo
        if (text && !isImage && WHERE.test(text.trim()) && (tester || inSession) && lastPaper.get(person)?.until > Date.now()) {
          if (!(await showWhere(sock, chat, person, msg))) {
            await sock.sendMessage(chat, { text: "📍 «وريني» كتخدم مع الفواتير والأوراق اللي فيهم مبلغ ولا أجل." });
          }
          continue;
        }
        // Question about the last paper, by voice note or text
        if ((isVoice || (text && !isImage && !START_WORDS.test(text))) && (tester || inSession) && lastPaper.get(person)?.until > Date.now()) {
          let question = text;
          if (isVoice) {
            question = await transcribe(msg);
            if (!question) {
              await sock.sendMessage(chat, { text: "ما فهمتش الڤوكال 🙏 عاود ولا كتب السؤال." });
              continue;
            }
            await sock.sendMessage(chat, { text: `🎤 «${question}»` }, { quoted: msg });
          }
          await answer(sock, chat, person, question, msg);
          continue;
        }
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
          if ((medsMode.get(person) || 0) > Date.now() || MEDS_WORDS.test(text)) await readMedsFlow(sock, chat, person, msg);
          else await readPaper(sock, chat, person, msg);
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
  `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>Qra Lia bot</title><style>body{font-family:system-ui,sans-serif;background:#f5f7f6;color:#111b21;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px}main{background:#fff;border-radius:24px;padding:28px;box-shadow:0 10px 30px #00806922;max-width:420px}img{width:280px;height:280px}</style></head><body><main>${body}</main></body></html>`;

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

await loadReminders();
setInterval(() => sendDueReminders().catch((e) => console.warn("reminders:", e?.message)), 60_000);
start();
