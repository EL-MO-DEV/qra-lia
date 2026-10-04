// WhatsApp bot webhook (official WhatsApp Cloud API).
// Photo in → the same reading as the web app (/api/read) → Darija text + voice note back.
// Nothing is stored: no photo, no phone number, no document text in the logs.
import { after } from "next/server";
import { buildShareText } from "@/lib/share";
import type { ReadResult } from "@/lib/types";
import {
  downloadMedia,
  messagesOf,
  sendAudio,
  sendText,
  validSignature,
  verifyChallenge,
  wavToMp3,
  whatsappEnabled,
  type IncomingMessage,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const TEXT = {
  welcome:
    "مرحبا بيك فـ Qra Lia 👋\nصيفط ليا *تصويرة ديال الورقة* (فاتورة، رسالة ديال البنكة، CNSS، الإدارة، ولا SMS مشكوك فيه) ونشرحها ليك بالدارجة، بالكتابة وبالصوت.\n\n🔒 التصويرة ما كتحفظش عندنا.",
  reading: "⏳ كنقرا الورقة… شي ثواني.",
  notImage: "صيفط ليا *تصويرة* ديال الورقة باش نقراها ليك 📸",
  tooBig: "التصويرة كبيرة بزاف. صيفطها عادية (ماشي كـ document).",
  failed: "ما قدرناش نقراو الورقة دابا. عاود صيفطها من بعد شوية 🙏",
  safety: "⚠️ إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.",
};

// Meta may deliver the same message twice: answer each message id once (per instance).
const seen = new Set<string>();

export async function GET(request: Request) {
  const challenge = verifyChallenge(new URL(request.url).searchParams);
  return challenge ? new Response(challenge) : new Response("forbidden", { status: 403 });
}

export async function POST(request: Request) {
  if (!whatsappEnabled()) return new Response("disabled", { status: 503 });
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }
  const origin = new URL(request.url).origin;
  const fresh = messagesOf(body).filter((m) => !seen.has(m.id));
  for (const m of fresh) seen.add(m.id);
  if (seen.size > 5000) seen.clear();

  // Answer Meta right away (it retries slow webhooks), then do the work.
  after(async () => {
    for (const message of fresh) {
      try {
        await handle(message, origin);
      } catch (e) {
        console.warn(JSON.stringify({ route: "whatsapp", error: e instanceof Error ? e.message.slice(0, 200) : "unknown" }));
        await sendText(message.from, TEXT.failed).catch(() => {});
      }
    }
  });
  return new Response("ok");
}

async function handle(message: IncomingMessage, origin: string) {
  const media = message.image ?? (message.document?.mime_type.startsWith("image/") ? message.document : undefined);
  if (!media) {
    await sendText(message.from, message.type === "text" ? TEXT.welcome : TEXT.notImage);
    return;
  }

  await sendText(message.from, TEXT.reading);
  const { bytes, mimeType } = await downloadMedia(media.id);
  if (bytes.length > MAX_IMAGE_BYTES) {
    await sendText(message.from, TEXT.tooBig);
    return;
  }
  const type = mimeType.split(";")[0].trim();

  const res = await fetch(`${origin}/api/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(35_000),
    body: JSON.stringify({ imageBase64: bytes.toString("base64"), mimeType: MIME_TYPES.includes(type) ? type : "image/jpeg", lang: "ar" }),
  });
  if (!res.ok) throw new Error(`read http ${res.status}`);
  const result = (await res.json()) as ReadResult;
  console.info(JSON.stringify({ route: "whatsapp", status: result.status, provider: result.provider, risk: result.risk_level }));

  if (result.status !== "ok") {
    await sendText(message.from, `📸 ${result.darija_summary}`);
    return;
  }

  // 1) Text first (always arrives), 2) then the voice note (best effort).
  const scam = result.scam_suspected ? "🚨 *رد البال! هادي فيها علامات ديال النصب.* ما تصيفط حتى كود وما تكليكيش على الروابط.\n\n" : "";
  await sendText(message.from, `${scam}${buildShareText(result, "ar")}\n\n${TEXT.safety}`);

  const spoken = [result.scam_suspected ? "رد البال! هاد الورقة فيها علامات ديال النصب." : "", result.darija_summary]
    .filter(Boolean)
    .join(" ")
    .slice(0, 800);
  const tts = await fetch(`${origin}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ text: spoken, lang: "ar" }),
  }).catch(() => null);
  if (!tts?.ok) return; // the text is enough; no voice this time
  await sendAudio(message.from, await wavToMp3(new Uint8Array(await tts.arrayBuffer())));
}
