// POST /api/tts — Darija explanation → one fixed, natural voice (Gemini TTS "Sulafat") as WAV.
// Same voice on every phone (the browser voice differs per device and reads with a Standard Arabic accent).
// The client falls back to the browser voice if this fails.
import { parseLang } from "@/lib/lang";
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
const STYLE = {
  ar:
    "Read the following Moroccan Darija text aloud with a natural Moroccan accent (like a person from Casablanca), " +
    "warm, calm and clear, a little slowly, like explaining a paper to an elderly parent. Read only the text:",
  en: "Read the following English text aloud in a warm, calm and clear voice, a little slowly, like explaining a paper to an elderly parent. Read only the text:",
};

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

// ---------- Fallback voice: Groq TTS (Orpheus), separate quota from Gemini ----------
const GROQ_TTS = {
  ar: { model: process.env.GROQ_TTS_MODEL_AR?.trim() || "canopylabs/orpheus-arabic-saudi", voice: process.env.GROQ_TTS_VOICE_AR?.trim() || "fahad" },
  en: { model: process.env.GROQ_TTS_MODEL_EN?.trim() || "canopylabs/orpheus-v1-english", voice: process.env.GROQ_TTS_VOICE_EN?.trim() || "hannah" },
};
const GROQ_CHUNK_CHARS = 190; // Orpheus takes short inputs: synthesize sentence groups and join them

/** Split on sentence punctuation, then pack into chunks of at most `max` chars. */
function chunkText(text: string, max: number): string[] {
  const sentences = text.replace(/([.!?؟،؛])\s+/g, "$1\n").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (let sentence of sentences) {
    while (sentence.length > max) {
      const cut = sentence.lastIndexOf(" ", max);
      const at = cut > 0 ? cut : max;
      if (cur) {
        chunks.push(cur);
        cur = "";
      }
      chunks.push(sentence.slice(0, at).trim());
      sentence = sentence.slice(at).trim();
    }
    if ((cur + " " + sentence).trim().length > max) {
      if (cur) chunks.push(cur);
      cur = sentence;
    } else cur = (cur + " " + sentence).trim();
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Read a PCM WAV: sample rate, channels, bits and the raw data chunk. */
function parseWav(buf: Buffer): { rate: number; channels: number; bits: number; data: Buffer } | null {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let off = 12;
  let rate = 0, channels = 0, bits = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(off + 10);
      rate = buf.readUInt32LE(off + 12);
      bits = buf.readUInt16LE(off + 22);
    } else if (id === "data") {
      if (size === 0 || size === 0xffffffff || off + 8 + size > buf.length) size = buf.length - off - 8; // streamed WAVs
      return { rate, channels, bits, data: buf.subarray(off + 8, off + 8 + size) };
    }
    off += 8 + size + (size % 2);
  }
  return null;
}

/** Groq's 400 for a bad voice lists the valid ones ("… one of [a, b, c]" or "…: a, b, c"): take the first. */
function voiceFromError(message: string): string | null {
  const list =
    /\[([^\]]+)\]/.exec(message)?.[1] ?? // [noura, abdullah]
    /one of:?\s*([^\n.]+)/i.exec(message)?.[1] ?? // one of noura, abdullah
    null;
  if (!list) return null;
  const first = list.split(/[,|\s]+/).map((v) => v.replace(/["'`]/g, "")).find((v) => /^[a-z][\w-]*$/i.test(v));
  return first ?? null;
}

async function groqSpeech(text: string, lang: "ar" | "en", deadline: number): Promise<{ wav: Buffer; detail: string }> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("groq tts: no key");
  const { model } = GROQ_TTS[lang];
  let voice = GROQ_TTS[lang].voice;

  const speakChunk = async (chunk: string, canSwitchVoice: boolean): Promise<{ data: Buffer; rate: number }> => {
    for (let attempt = 0; ; attempt++) {
      const left = deadline - Date.now();
      if (left < 3_000) throw new Error("groq tts: out of time");
      const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(left),
        body: JSON.stringify({ model, voice, input: chunk, response_format: "wav" }),
      });
      if (res.ok) {
        const wav = parseWav(Buffer.from(await res.arrayBuffer()));
        if (!wav || wav.bits !== 16 || wav.channels !== 1) throw new Error("groq tts: unexpected audio format");
        return { data: wav.data, rate: wav.rate };
      }
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = body.error?.message ?? "";
      const suggested = canSwitchVoice && res.status === 400 && attempt === 0 ? voiceFromError(message) : null;
      if (suggested && suggested !== voice) {
        voice = suggested; // wrong default voice name: use the first valid one Groq lists
        continue;
      }
      throw new Error(`groq tts http ${res.status}: ${message.slice(0, 180)} (model ${model}, voice ${voice})`);
    }
  };

  // First chunk alone (it settles the voice name), then the rest in parallel: ~11 s → ~5 s.
  const [first, ...rest] = chunkText(text, GROQ_CHUNK_CHARS);
  if (!first) throw new Error("groq tts: empty text");
  const parts = [await speakChunk(first, true), ...(await Promise.all(rest.map((c) => speakChunk(c, false))))];
  const rate = parts[0].rate;
  if (parts.some((p) => p.rate !== rate)) throw new Error("groq tts: mixed sample rates");
  const pcm = Buffer.concat(parts.map((p) => p.data));
  return { wav: pcmToWav(resample(pcm, rate, OUTPUT_RATE), OUTPUT_RATE), detail: `${model} / ${voice}` };
}

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

  let body: { text?: unknown; voice?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return fail(400, "invalid_input");
  const lang = parseLang(body.lang);
  const envVoice = process.env.GEMINI_TTS_VOICE?.trim() || DEFAULT_VOICE;
  const voice = typeof body.voice === "string" && (VOICES as readonly string[]).includes(body.voice) ? body.voice : envVoice;

  const cacheKey = `${lang}|${voice}|${text}`;
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
  const groqAvailable = Boolean(process.env.GROQ_API_KEY?.trim());

  gemini: for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (timeLeft() < 8_000) break gemini;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            signal: AbortSignal.timeout(timeLeft()),
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${STYLE[lang]}\n\n${text}` }] }],
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
          // With a Groq fallback available, don't make the user wait for Gemini's quota window.
          if (groqAvailable || wait > MAX_RETRY_WAIT_MS || wait > timeLeft() - 15_000) break;
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
  // Fallback voice: Groq TTS (separate quota).
  if (groqAvailable && timeLeft() > 6_000) {
    try {
      const { wav, detail } = await groqSpeech(text, lang, started + BUDGET_MS);
      remember(cacheKey, wav);
      console.info(JSON.stringify({ route: "tts", provider: "groq", model: detail, chars: text.length, ms: Date.now() - started, bytes: wav.length, gemini: lastError }));
      return new Response(new Uint8Array(wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" } });
    } catch (e) {
      lastError = `${lastError} | ${e instanceof Error ? e.message : "groq tts error"}`;
    }
  }
  return fail(502, "tts_unavailable", lastError);
}
