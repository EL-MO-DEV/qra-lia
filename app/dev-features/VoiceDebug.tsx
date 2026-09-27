"use client";

import { useEffect, useState } from "react";
import { isSpeechSupported, pickArabicVoice } from "@/lib/tts";

type VoiceInfo = { name: string; lang: string; local: boolean };

// Lists the Arabic voices this device exposes and which one ListenButton will pick.
export default function VoiceDebug() {
  const [info, setInfo] = useState<{ total: number; arabic: VoiceInfo[]; picked: string | null } | null>(null);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const synth = window.speechSynthesis;
    const read = () => {
      const voices = synth.getVoices();
      const picked = pickArabicVoice(voices);
      setInfo({
        total: voices.length,
        arabic: voices
          .filter((v) => v.lang.toLowerCase().startsWith("ar"))
          .map((v) => ({ name: v.name, lang: v.lang, local: v.localService })),
        picked: picked ? `${picked.name} (${picked.lang})` : null,
      });
    };
    read();
    synth.addEventListener("voiceschanged", read);
    return () => synth.removeEventListener("voiceschanged", read);
  }, []);

  return (
    <pre dir="ltr" className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-current p-3 text-xs opacity-80">
      {info === null
        ? "speechSynthesis: not supported (or no voices yet)"
        : [
            `voices: ${info.total} · arabic: ${info.arabic.length}`,
            `picked: ${info.picked ?? "none → button hidden"}`,
            ...info.arabic.map((v) => `- ${v.name} [${v.lang}]${v.local ? " local" : " network"}`),
          ].join("\n")}
    </pre>
  );
}
