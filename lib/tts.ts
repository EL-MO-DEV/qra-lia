// Text-to-speech with the browser Web Speech API (no server, no audio upload).
// The browser voice reads Darija with a Standard Arabic accent — a real Darija voice is a next step.

const RATE = 0.9;
const MAX_CHUNK = 180; // some engines cut long utterances (Chrome stops after ~15 s)

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

// Android sometimes reports "ar_MA" instead of "ar-MA".
function normLang(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

/** Prefer ar-MA, else any ar-* voice; on a tie prefer on-device voices. */
export function pickArabicVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const arabic = voices.filter((v) => normLang(v.lang).startsWith("ar"));
  if (arabic.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) =>
    (normLang(v.lang) === "ar-ma" ? 2 : 0) + (v.localService ? 1 : 0);
  return arabic.reduce((best, v) => (score(v) > score(best) ? v : best));
}

/** Voices load asynchronously: try now, then on every `voiceschanged`. Returns an unsubscribe fn. */
export function watchArabicVoice(
  onVoice: (voice: SpeechSynthesisVoice | null) => void,
): () => void {
  if (!isSpeechSupported()) {
    onVoice(null);
    return () => {};
  }
  const synth = window.speechSynthesis;
  const check = () => onVoice(pickArabicVoice(synth.getVoices()));
  check();
  synth.addEventListener("voiceschanged", check);
  return () => synth.removeEventListener("voiceschanged", check);
}

/** Split on sentence punctuation (. ، ! ؟ ? ؛) and newlines, then cap chunk length on spaces. */
export function splitSentences(text: string): string[] {
  const sentences = text
    .replace(/([.!?؟،؛])\s+/g, "$1\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const sentence of sentences) {
    let rest = sentence;
    while (rest.length > MAX_CHUNK) {
      const cut = rest.lastIndexOf(" ", MAX_CHUNK);
      const at = cut > 0 ? cut : MAX_CHUNK;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}

let current: { done: () => void; watchdog: ReturnType<typeof setInterval> } | null = null;

/**
 * Speak `text` sentence by sentence. Must be called from a tap handler (iOS).
 * `onDone` fires exactly once: when speech ends, fails, or is stopped / replaced.
 */
export function speak(
  text: string,
  voice: SpeechSynthesisVoice,
  onDone: () => void,
): void {
  const synth = window.speechSynthesis;
  stopSpeaking();

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    if (current?.done === done) {
      clearInterval(current.watchdog);
      current = null;
    }
    onDone();
  };

  const chunks = splitSentences(text);
  if (chunks.length === 0) {
    done();
    return;
  }

  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = RATE;
    u.onerror = (e) => {
      if (finished) return;
      // A real failure mid-queue: stop the rest instead of reading half the text.
      if (e.error !== "interrupted" && e.error !== "canceled") synth.cancel();
      done();
    };
    if (i === chunks.length - 1) u.onend = done;
    synth.speak(u);
  });

  // Some Android builds never fire `end`: poll once speech has had time to start.
  const startedAt = Date.now();
  const watchdog = setInterval(() => {
    if (Date.now() - startedAt > 1500 && !synth.speaking && !synth.pending) done();
  }, 500);
  current = { done, watchdog };
}

/** Stop any speech. The caller that started it gets its `onDone`. */
export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  const running = current;
  window.speechSynthesis.cancel();
  // Engines don't always fire `error` on cancel, so notify the caller explicitly.
  running?.done();
}
