"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2, VolumeX } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { pickArabicVoice, pickEnglishVoice, speak, stopSpeaking, watchArabicVoice } from "@/lib/tts";
import { playVoice, prefetchVoice, stopVoice } from "@/lib/voice";

type Props = {
  text: string;
  /** Darija label + French subtitle (default: "سمع الشرح" / "Écouter l'explication"). */
  label?: string;
  sub?: string;
  /** Download the audio before the tap (default false: each download spends TTS quota, so only on tap). */
  prefetch?: boolean;
};

/**
 * 🔊 Listen. Plays the server voice (Gemini TTS: one natural voice, same on every phone),
 * downloaded as soon as the result shows. Falls back to the phone's Arabic voice if it fails.
 */
export function ListenButton({ text, label, sub = "Écouter l'explication", prefetch = false }: Props) {
  const { lang, t } = useLang();
  // Fallback phone voice, found per language (voices load asynchronously).
  const [phoneVoices, setPhoneVoices] = useState<Partial<Record<"ar" | "en", SpeechSynthesisVoice>>>({});
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const owns = useRef(false);

  useEffect(
    () =>
      watchArabicVoice(
        (v) => v && setPhoneVoices((prev) => (prev[lang] === v ? prev : { ...prev, [lang]: v })),
        lang === "en" ? pickEnglishVoice : pickArabicVoice,
      ),
    [lang],
  );
  const browserVoice = phoneVoices[lang] ?? null;

  // New document: start downloading its audio now; stop our playback on change/unmount.
  useEffect(() => {
    if (prefetch) prefetchVoice(text, undefined, lang).catch(() => {});
    return () => {
      if (owns.current) {
        stopVoice();
        stopSpeaking();
      }
    };
  }, [text, prefetch, lang]);

  const finish = () => {
    owns.current = false;
    setPlaying(false);
    setLoading(false);
  };

  const onClick = async () => {
    if (playing) {
      stopVoice();
      stopSpeaking();
      finish();
      return;
    }
    owns.current = true;
    setPlaying(true);
    setLoading(true);
    setUnavailable(false);
    try {
      await playVoice(text, undefined, () => setLoading(false), lang);
      finish();
    } catch {
      // Server voice failed (quota, network): use the phone's voice if it has an Arabic one.
      if (browserVoice && owns.current) {
        setLoading(false);
        speak(text, browserVoice, finish);
      } else {
        finish();
        setUnavailable(true);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={`feature-btn feature-btn-primary${playing ? " is-playing" : ""}`}
        aria-live="polite"
      >
        <span className="feature-btn-icon" aria-hidden="true">
          {loading ? (
            <Loader2 size={26} strokeWidth={2.4} className="spin" />
          ) : playing ? (
            <Square size={22} strokeWidth={2.6} fill="currentColor" />
          ) : (
            <Volume2 size={26} strokeWidth={2.4} />
          )}
        </span>
        {playing && !loading && (
          <span className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
        <span className="feature-btn-text">
          <span className="feature-btn-label">{loading ? t("loadingVoice") : playing ? t("stop") : label ?? t("listen")}</span>
          <span className="feature-btn-sub" lang="fr">
            {loading ? "Préparation de la voix…" : playing ? "Arrêter" : sub}
          </span>
        </span>
      </button>
      {unavailable && (
        <p className="feature-note" role="status">
          <VolumeX size={18} strokeWidth={2.4} aria-hidden="true" /> {t("voiceDown")}
          <span className="fr" lang="fr">
            Voix indisponible pour le moment
          </span>
        </p>
      )}
    </>
  );
}

export default ListenButton;
