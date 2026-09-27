// POST /api/tts — Darija explanation → one fixed, natural voice (Gemini TTS) as WAV.
// Same voice on every phone (the browser voice differs per device and reads with a Standard Arabic accent).
// The client falls back to the browser voice if this fails.
import { VOICES } from "@/lib/voices";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIMEOUT_MS = 45_000; // long texts (whole page) take ~20 s to synthesize
const MAX_CHARS = 1200;
const RATE_LIMIT_PER_MINUTE = 20;
// Flash only: the -lite model was observed reading the style instruction aloud (audio twice as long).
const DEFAULT_MODELS = "gemini-3.8-flash-tts";
const DEFAULT_VOICE: string = VOICES[0];

// Style direction for the TTS model (not read aloud).
const STYLE =
  "Read the following Moroccan Darija text aloud with a natural Moroccan accent (like a person from Casablanca), " +
  "warm, calm and clear, a little slowly, like explaining a paper to an elderly parent. Read only the text:";

// Same text + voice → same audio: keep recent results in memory (per server instance)
// so repeated texts (the home page narration) don't spend the TTS quota again.
const audioCache = new Map<string, Buffer>();
const AUDIO_CACHE_MAX = 30;
function remember(key: string, wav: Buffer) {
  audioCache.delete(key);
  audioCache.set(key, wav);
  if (audioCache.size > AUDIO_CACHE_MAX) audioCache.delete(audioCache.keys().next().value as string);
}

const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

/** Wrap raw 16-bit little-endian mono PCM in a WAV header so every browser can play it. */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

type TtsResponse = {
  candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  error?: { message?: string; status?: string };
};

function fail(status: number, error: string, detail?: string) {
  console.warn(JSON.stringify({ route: "tts", error, detail }));
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return fail(502, "tts_unavailable", "no key");

  // Same-origin only: this endpoint spends our TTS quota.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return fail(403, "forbidden");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited");

  let body: { text?: unknown; voice?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return fail(400, "invalid_input");
  const envVoice = process.env.GEMINI_TTS_VOICE?.trim() || DEFAULT_VOICE;
  const voice = typeof body.voice === "string" && (VOICES as readonly string[]).includes(body.voice) ? body.voice : envVoice;

  const cacheKey = `${voice}|${text}`;
  const cached = audioCache.get(cacheKey);
  if (cached) {
    console.info(JSON.stringify({ route: "tts", voice, chars: text.length, cache: "hit" }));
    return new Response(new Uint8Array(cached), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" } });
  }

  const models = (process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_MODELS).split(",").map((m) => m.trim()).filter(Boolean);
  const started = Date.now();
  let lastError = "no attempt";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${STYLE}\n\n${text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
            },
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as TtsResponse;
      if (!res.ok) {
        lastError = `http ${res.status}: ${data.error?.status ?? ""} ${data.error?.message ?? ""}`.slice(0, 220) + ` (model ${model})`;
        continue;
      }
      const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!inline?.data) {
        lastError = `no audio in response (model ${model})`;
        continue;
      }
      const raw = Buffer.from(inline.data, "base64");
      const mime = inline.mimeType ?? "";
      const wav = /wav/i.test(mime) ? raw : pcmToWav(raw, Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000));
      remember(cacheKey, wav);
      // Never log the text.
      console.info(JSON.stringify({ route: "tts", model, voice, chars: text.length, ms: Date.now() - started, bytes: wav.length }));
      return new Response(new Uint8Array(wav), {
        headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" },
      });
    } catch (e) {
      lastError = `${e instanceof Error ? `${e.name}: ${e.message}` : "error"} (model ${model})`;
    }
  }
  return fail(502, "tts_unavailable", lastError);
}
