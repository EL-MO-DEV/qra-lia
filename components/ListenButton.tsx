"use client";

import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking, watchArabicVoice } from "@/lib/tts";

type Props = { text: string };

// How long to wait for voices to load before declaring "no Arabic voice".
const VOICE_TIMEOUT_MS = 2500;

export function ListenButton({ text }: Props) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceChecked, setVoiceChecked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const ownsSpeech = useRef(false);

  useEffect(() => {
    const unwatch = watchArabicVoice((v) => {
      if (v) {
        setVoice(v);
        setVoiceChecked(true);
      }
    });
    const timer = setTimeout(() => setVoiceChecked(true), VOICE_TIMEOUT_MS);
    return () => {
      unwatch();
      clearTimeout(timer);
    };
  }, []);

  // New document (text changed) or unmount: stop our speech.
  useEffect(() => {
    return () => {
      if (ownsSpeech.current) stopSpeaking();
    };
  }, [text]);

  if (!voiceChecked) return null;

  if (!voice) {
    return (
      <p className="feature-note">
        🔇 الصوت ما متوفرش فهاد التيليفون
        <span className="fr" lang="fr">
          Voix non disponible sur cet appareil
        </span>
      </p>
    );
  }

  const onClick = () => {
    if (speaking) {
      stopSpeaking();
      return;
    }
    ownsSpeech.current = true;
    setSpeaking(true);
    speak(text, voice, () => {
      ownsSpeech.current = false;
      setSpeaking(false);
    });
  };

  return (
    <button type="button" onClick={onClick} className="feature-btn feature-btn-primary">
      <span className="feature-btn-icon" aria-hidden="true">
        {speaking ? "⏹️" : "🔊"}
      </span>
      <span className="feature-btn-text">
        <span className="feature-btn-label">{speaking ? "وقّف" : "سمع الشرح"}</span>
        <span className="feature-btn-sub" lang="fr">
          {speaking ? "Arrêter" : "Écouter l'explication"}
        </span>
      </span>
    </button>
  );
}

export default ListenButton;
