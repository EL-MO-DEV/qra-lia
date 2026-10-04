// POST /api/stt — voice note → text (Groq Whisper). Body: { audioBase64, mimeType, lang? } → { text }
// The audio is sent to Groq for transcription only and never stored or logged.
import { parseLang } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 2 * 1024 * 1024; // ~2 min of WhatsApp voice note
const RATE_LIMIT_PER_MINUTE = 20;
const MODELS = () => (process.env.GROQ_STT_MODEL?.trim() || "whisper-large-v3-turbo,whisper-large-v3").split(",").map((m) => m.trim()).filter(Boolean);
const EXT: Record<string, string> = {
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "m4a", "audio/webm": "webm", "audio/wav": "wav", "audio/x-wav": "wav",
};
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

function fail(status: number, error: string, detail?: string) {
  console.warn(JSON.stringify({ route: "stt", error, detail }));
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return fail(502, "stt_unavailable", "no key");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited");

  let body: { audioBase64?: unknown; mimeType?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.split(";")[0].trim() : "";
  const ext = EXT[mimeType];
  const b64 = typeof body.audioBase64 === "string" ? body.audioBase64.replace(/^data:[^,]*,/, "") : "";
  if (!ext || !b64) return fail(400, "invalid_input");
  const audio = Buffer.from(b64, "base64");
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) return fail(413, "audio_too_large");
  const lang = parseLang(body.lang);

  let lastError = "no attempt";
  for (const model of MODELS()) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `voice.${ext}`);
    form.append("model", model);
    form.append("language", lang === "en" ? "en" : "ar");
    form.append("response_format", "json");
    form.append("temperature", "0");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
      body: form,
    }).catch((e: unknown) => {
      lastError = e instanceof Error ? e.message : "network";
      return null;
    });
    if (!res) continue;
    if (res.ok) {
      const text = String(((await res.json()) as { text?: string }).text ?? "").trim();
      console.info(JSON.stringify({ route: "stt", model, chars: text.length }));
      return Response.json({ text });
    }
    lastError = `http ${res.status}: ${(await res.text()).slice(0, 160)} (model ${model})`;
    if (res.status !== 404 && res.status !== 400) break; // only a missing/unsupported model is worth the next one
  }
  return fail(502, "stt_unavailable", lastError);
}
