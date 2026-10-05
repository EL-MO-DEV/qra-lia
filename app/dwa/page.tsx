"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CircleAlert, ImageOff, Languages, Pill } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Loading from "@/components/Loading";
import MedsCard from "@/components/MedsCard";
import UploadPanel from "@/components/UploadPanel";
import { compressImage } from "@/lib/compress";
import { useLang, type StringKey } from "@/lib/i18n";
import type { MedsResult } from "@/lib/medsSchedule";

type State =
  | { screen: "idle" }
  | { screen: "loading"; previewUrl: string | null }
  | { screen: "result"; result: MedsResult }
  | { screen: "error"; message: StringKey; unreadable?: boolean };

/** 💊 /dwa — photograph a prescription or medicine box, get a simple daily schedule (text + voice + reminders). */
export default function MedsPage() {
  const { lang, setLang, t } = useLang();
  const [state, setState] = useState<State>({ screen: "idle" });
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen]);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const onFile = useCallback(
    async (file: File) => {
      setState({ screen: "loading", previewUrl: null });
      try {
        const { base64, mimeType, previewUrl } = await compressImage(file);
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = previewUrl;
        setState({ screen: "loading", previewUrl });
        const res = await fetch("/api/meds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType, lang }),
        });
        if (res.status === 429) return setState({ screen: "error", message: "errRate" });
        if (!res.ok) return setState({ screen: "error", message: "errAi" });
        const result = (await res.json()) as MedsResult;
        if (result.status === "unreadable") return setState({ screen: "error", message: "errUnreadable", unreadable: true });
        if (result.status === "not_medical" || result.medicines.length === 0) return setState({ screen: "error", message: "medsNotMedical" });
        setState({ screen: "result", result });
      } catch {
        setState({ screen: "error", message: "errNetwork" });
      }
    },
    [lang],
  );

  const reset = () => setState({ screen: "idle" });
  const busy = state.screen === "loading";

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand" aria-label={t("homeLabel")}>
            <BrandMark />
            <span className="brand-name">
              <strong>{t("brandName")}</strong>
              <span>{t("brandSub")}</span>
            </span>
          </Link>
          <button
            type="button"
            className="lang-switch"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            disabled={busy}
            aria-label={t("switchLabel")}
          >
            <Languages size={20} strokeWidth={2.4} aria-hidden="true" /> {t("switchTo")}
          </button>
        </div>
      </header>

      <main className="app-column">
        {state.screen === "idle" && (
          <div className="result">
            <div className="section-head" style={{ marginBottom: 6 }}>
              <span className="error-icon" aria-hidden="true" style={{ background: "var(--primary-soft)", color: "var(--primary-text)" }}>
                <Pill size={44} strokeWidth={2} />
              </span>
              <h1 className="section-title">
                {t("medsTitle")}
                <span className="fr" lang="fr">
                  Comprendre vos médicaments
                </span>
              </h1>
              <p className="section-sub">{t("medsIntro")}</p>
            </div>
            <div className="hero-card" style={{ marginTop: 0 }}>
              <UploadPanel onFileChosen={onFile} />
            </div>
            <p className="feature-note">{t("medsSafety")}</p>
          </div>
        )}

        {state.screen === "loading" && <Loading previewUrl={state.previewUrl} />}

        {state.screen === "result" && <MedsCard result={state.result} onRetake={reset} />}

        {state.screen === "error" && (
          <div className="card error-card" role="alert">
            <span className="error-icon" aria-hidden="true">
              {state.unreadable ? <ImageOff size={44} strokeWidth={2} /> : <CircleAlert size={44} strokeWidth={2} />}
            </span>
            <p className="error-message">{t(state.message)}</p>
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={reset}>
              <Camera size={24} strokeWidth={2.3} aria-hidden="true" /> {t("retry")}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
