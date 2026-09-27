"use client";

import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking, watchArabicVoice } from "@/lib/tts";
import { playVoice, prefetchVoice, stopVoice } from "@/lib/voice";

type Props = { text: string };

/**
 * 🔊 Listen. Plays the server voice (Gemini TTS: one natural voice, same on every phone),
 * downloaded as soon as the result shows. Falls back to the phone's Arabic voice if it fails.
 */
export function ListenButton({ text }: Props) {
  const [browserVoice, setBrowserVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const owns = useRef(false);

  useEffect(() => watchArabicVoice((v) => v && setBrowserVoice(v)), []);

  // New document: start downloading its audio now; stop our playback on change/unmount.
  useEffect(() => {
    prefetchVoice(text).catch(() => {});
    return () => {
      if (owns.current) {
        stopVoice();
        stopSpeaking();
      }
    };
  }, [text]);

  const finish = () => {
    owns.current = false;
    setPlaying(false);
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
    setUnavailable(false);
    try {
      await playVoice(text);
      finish();
    } catch {
      // Server voice failed (quota, network): use the phone's voice if it has an Arabic one.
      if (browserVoice && owns.current) {
        speak(text, browserVoice, finish);
      } else {
        finish();
        setUnavailable(true);
      }
    }
  };

  return (
    <>
      <button type="button" onClick={onClick} className="feature-btn feature-btn-primary" aria-live="polite">
        <span className="feature-btn-icon" aria-hidden="true">
          {playing ? "⏹️" : "🔊"}
        </span>
        <span className="feature-btn-text">
          <span className="feature-btn-label">{playing ? "وقّف" : "سمع الشرح"}</span>
          <span className="feature-btn-sub" lang="fr">
            {playing ? "Arrêter" : "Écouter l'explication"}
          </span>
        </span>
      </button>
      {unavailable && (
        <p className="feature-note" role="status">
          🔇 الصوت ما خدامش دابا، عاود من بعد شوية
          <span className="fr" lang="fr">
            Voix indisponible pour le moment
          </span>
        </p>
      )}
    </>
  );
}

export default ListenButton;
