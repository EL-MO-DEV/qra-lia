// Server voice (Gemini TTS via /api/tts): one natural voice, the same on every phone.
// Audio is fetched ahead of time (as soon as the result shows) so a tap plays instantly.

const cache = new Map<string, Promise<string>>(); // key → object URL of the WAV

// Tiny silent WAV: playing it inside the tap "unlocks" the shared <audio> on iOS,
// so the real audio can start even if it finishes downloading after the tap.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

let player: HTMLAudioElement | null = null;
function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = "auto";
  }
  return player;
}

/** Start (or reuse) the download of the spoken version of `text`. */
export function prefetchVoice(text: string, voice?: string, lang: "ar" | "en" = "ar"): Promise<string> {
  const key = `${lang}|${voice ?? ""}|${text}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, lang }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`tts ${res.status}`);
      return URL.createObjectURL(await res.blob());
    });
    // A failed download must not stay cached: the next tap retries.
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

let current: { stop: () => void } | null = null;

/**
 * Play the server voice. Call from a tap handler. Resolves when playback ends or is stopped;
 * rejects if the audio could not be fetched/played (caller falls back to the browser voice).
 */
export async function playVoice(
  text: string, voice?: string, onStart?: () => void, lang: "ar" | "en" = "ar",
): Promise<void> {
  stopVoice();
  const audio = getPlayer();
  // Unlock inside the gesture (iOS), then swap in the real audio.
  audio.src = SILENT_WAV;
  audio.play().catch(() => {});

  let stopped = false;
  const done = new Promise<void>((resolve, reject) => {
    current = {
      stop: () => {
        stopped = true;
        audio.pause();
        resolve();
      },
    };
    prefetchVoice(text, voice, lang)
      .then((url) => {
        if (stopped) return;
        audio.src = url;
        audio.onplaying = () => onStart?.();
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("audio error"));
        return audio.play();
      })
      .catch(reject);
  });

  try {
    await done;
  } finally {
    current = null;
  }
}

export function stopVoice(): void {
  current?.stop();
}
