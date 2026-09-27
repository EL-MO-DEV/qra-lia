"use client";

import { useState } from "react";
import { MOCK_OK } from "@/lib/mock";
import { playVoice, stopVoice } from "@/lib/voice";
import { VOICES } from "@/lib/voices";

// Audition the Gemini voices on the same Darija text, to pick GEMINI_TTS_VOICE.
export default function VoicePicker() {
  const [status, setStatus] = useState<Record<string, string>>({});

  const play = async (voice: string) => {
    stopVoice();
    setStatus((s) => ({ ...s, [voice]: "⏳" }));
    const t = Date.now();
    try {
      await playVoice(MOCK_OK.darija_summary, voice);
      setStatus((s) => ({ ...s, [voice]: `✅ ${((Date.now() - t) / 1000).toFixed(1)}s` }));
    } catch (e) {
      setStatus((s) => ({ ...s, [voice]: `❌ ${e instanceof Error ? e.message : "error"}` }));
    }
  };

  return (
    <section className="card" style={{ display: "grid", gap: 8 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎙️ Gemini voices</h2>
      {VOICES.map((v, i) => (
        <button key={v} type="button" className="feature-btn" onClick={() => play(v)}>
          <span className="feature-btn-icon" aria-hidden="true">
            🔊
          </span>
          <span className="feature-btn-text" dir="ltr">
            <span className="feature-btn-label">
              {v}
              {i === 0 ? " (default)" : ""}
            </span>
            <span className="feature-btn-sub">{status[v] ?? "tap to listen"}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
