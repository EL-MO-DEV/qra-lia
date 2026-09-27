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
      <p className="text-center text-base opacity-80">
        الصوت ما متوفرش فهاد التيليفون
        <span dir="ltr" lang="fr" className="block text-sm">
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
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-current px-5 py-3 text-start focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <span aria-hidden="true" className="text-2xl">
        {speaking ? "⏹️" : "🔊"}
      </span>
      <span className="flex flex-col items-start">
        <span className="text-xl font-bold">{speaking ? "وقّف" : "سمع الشرح"}</span>
        <span dir="ltr" lang="fr" className="text-sm opacity-80">
          {speaking ? "Arrêter" : "Écouter"}
        </span>
      </span>
    </button>
  );
}

export default ListenButton;
