// WhatsApp Cloud API (official Meta API) helpers for the Qra Lia bot.
// Env (set in Vercel only): WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN,
// WHATSAPP_APP_SECRET, optional WHATSAPP_GRAPH_VERSION.
import { createHmac, timingSafeEqual } from "node:crypto";

const env = (name: string) => process.env[name]?.trim() ?? "";
const graph = (path: string) => `https://graph.facebook.com/${env("WHATSAPP_GRAPH_VERSION") || "v23.0"}/${path}`;
const auth = () => ({ Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` });

export function whatsappEnabled(): boolean {
  return Boolean(env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_APP_SECRET"));
}

/** Meta's webhook check: GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… */
export function verifyChallenge(params: URLSearchParams): string | null {
  const token = env("WHATSAPP_VERIFY_TOKEN");
  if (!token || params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== token) return null;
  return params.get("hub.challenge");
}

/** Every POST from Meta is signed with the app secret (X-Hub-Signature-256). Reject anything else. */
export function validSignature(rawBody: string, header: string | null): boolean {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const got = Buffer.from(header.slice("sha256=".length));
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export type IncomingMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string };
};

type WebhookBody = { entry?: { changes?: { value?: { messages?: IncomingMessage[] } }[] }[] };

/** Messages from the webhook payload (delivery/read statuses are ignored). */
export function messagesOf(body: unknown): IncomingMessage[] {
  const entries = (body as WebhookBody)?.entry ?? [];
  return entries.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []);
}

/** Download a media file the user sent (two steps: get its URL, then the bytes, both with our token). */
export async function downloadMedia(mediaId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const meta = await fetch(graph(mediaId), { headers: auth(), signal: AbortSignal.timeout(10_000) });
  if (!meta.ok) throw new Error(`media meta http ${meta.status}`);
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
  const file = await fetch(url, { headers: auth(), signal: AbortSignal.timeout(15_000) });
  if (!file.ok) throw new Error(`media download http ${file.status}`);
  return { bytes: Buffer.from(await file.arrayBuffer()), mimeType: mime_type };
}

async function send(to: string, message: Record<string, unknown>): Promise<void> {
  const res = await fetch(graph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`), {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...message }),
  });
  if (!res.ok) throw new Error(`send http ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

export function sendText(to: string, body: string): Promise<void> {
  return send(to, { type: "text", text: { body: body.slice(0, 4000), preview_url: false } });
}

/** Upload an MP3 to WhatsApp, then send it as an audio message. */
export async function sendAudio(to: string, mp3: Uint8Array): Promise<void> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), "qra-lia.mp3");
  const res = await fetch(graph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/media`), {
    method: "POST",
    headers: auth(),
    signal: AbortSignal.timeout(15_000),
    body: form,
  });
  if (!res.ok) throw new Error(`upload http ${res.status}`);
  const { id } = (await res.json()) as { id: string };
  await send(to, { type: "audio", audio: { id } });
}

/** WhatsApp doesn't play WAV: convert our 16-bit mono WAV (from /api/tts) to MP3. */
export async function wavToMp3(wav: Uint8Array): Promise<Uint8Array> {
  // Dynamic import: the package's CommonJS build exports nothing, its ESM build does.
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  let rate = 16_000;
  let pcm: Int16Array | null = null;
  while (offset + 8 <= wav.byteLength) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") rate = view.getUint32(offset + 12, true);
    if (id === "data") {
      const end = Math.min(offset + 8 + size, wav.byteLength);
      const data = wav.slice(offset + 8, end - ((end - offset - 8) % 2));
      pcm = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!pcm) throw new Error("wav: no data chunk");
  const encoder = new Mp3Encoder(1, rate, 48);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152 * 20) {
    const chunk = encoder.encodeBuffer(pcm.subarray(i, i + 1152 * 20));
    if (chunk.length) parts.push(new Uint8Array(chunk));
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(new Uint8Array(tail));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
