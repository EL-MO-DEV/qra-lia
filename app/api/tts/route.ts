// POST /api/tts — Darija explanation → one fixed, natural voice (Gemini TTS "Sulafat") as WAV.
// Same voice on every phone (the browser voice differs per device and reads with a Standard Arabic accent).
// The client falls back to the browser voice if this fails.
import { VOICES } from "@/lib/voices";

export const runtime = "nodejs";
export const maxDuration = 60;

// Whole request budget, under maxDuration: synthesis of ~500 chars takes ~15–20 s.
const BUDGET_MS = 52_000;
// ~800 chars ≈ 2 min of speech ≈ 3.8 MB at 16 kHz — Vercel responses are capped at 4.5 MB.
const MAX_CHARS = 800;
const OUTPUT_RATE = 16_000;
// Free-tier TTS allows only a few calls per minute: on 429, wait what Google asks (up to this) and retry.
const MAX_RETRY_WAIT_MS = 25_000;
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

/** Linear resampling of 16-bit little-endian mono PCM (24 kHz → 16 kHz keeps speech clear, 1/3 smaller). */
function resample(pcm: Buffer, from: number, to: number): Buffer {
  if (from === to) return pcm;
  const input = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const outLength = Math.floor((input.length * to) / from);
  const output = new Int16Array(outLength);
  const ratio = from / to;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const frac = pos - j;
    const a = input[j] ?? 0;
    const b = input[j + 1] ?? a;
    output[i] = Math.round(a + (b - a) * frac);
  }
  return Buffer.from(output.buffer);
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
  error?: { message?: string; status?: string; details?: { "@type"?: string; retryDelay?: string }[] };
};

/** Google's RetryInfo ("34s") → ms; default 10 s when absent. */
function retryDelayMs(data: TtsResponse): number {
  const delay = data.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"))?.retryDelay;
  const seconds = delay ? parseFloat(delay) : NaN;
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 500 : 10_000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(status: number, error: string, detail?: string) {
  console.warn(JSON.stringify({ route: "tts", error, detail }));
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  // Optional dedicated key (e.g. a billing-enabled project) so the voice never eats the reading quota.
  const key = process.env.GEMINI_TTS_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
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
  const timeLeft = () => BUDGET_MS - (Date.now() - started);
  let lastError = "no attempt";
  let retries = 0;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (timeLeft() < 8_000) return fail(502, "tts_unavailable", `out of time, last: ${lastError}`);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            signal: AbortSignal.timeout(timeLeft()),
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
        if (res.status === 429) {
          // Per-minute quota: wait what Google asks, then retry the same model (never log the text).
          const wait = retryDelayMs(data);
          lastError = `http 429 (retry in ${wait} ms) (model ${model})`;
          if (wait > MAX_RETRY_WAIT_MS || wait > timeLeft() - 15_000) break;
          retries++;
          await sleep(wait);
          continue;
        }
        if (!res.ok) {
          lastError = `http ${res.status}: ${data.error?.status ?? ""} ${data.error?.message ?? ""}`.slice(0, 220) + ` (model ${model})`;
          break;
        }
        const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (!inline?.data) {
          lastError = `no audio in response (model ${model})`;
          break;
        }
        const raw = Buffer.from(inline.data, "base64");
        const mime = inline.mimeType ?? "";
        const wav = /wav/i.test(mime)
          ? raw
          : pcmToWav(resample(raw, Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000), OUTPUT_RATE), OUTPUT_RATE);
        remember(cacheKey, wav);
        console.info(
          JSON.stringify({ route: "tts", model, voice, chars: text.length, ms: Date.now() - started, bytes: wav.length, retries }),
        );
        return new Response(new Uint8Array(wav), {
          headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" },
        });
      } catch (e) {
        lastError = `${e instanceof Error ? `${e.name}: ${e.message}` : "error"} (model ${model})`;
        break;
      }
    }
  }
  return fail(502, "tts_unavailable", lastError);
}
