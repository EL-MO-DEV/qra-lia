"use client";

import { Send } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { shareResult } from "@/lib/share";
import type { ReadResult } from "@/lib/types";

type Props = { result: ReadResult };

export function ShareButton({ result }: Props) {
  const { lang, t } = useLang();
  return (
    <button type="button" className="feature-btn feature-btn-share" onClick={() => void shareResult(result, lang)}>
      <span className="feature-btn-icon" aria-hidden="true">
        <Send size={24} strokeWidth={2.3} className="flip-rtl" />
      </span>
      <span className="feature-btn-text">
        <span className="feature-btn-label">{t("share")}</span>
        <span className="feature-btn-sub" lang="fr">
          Envoyer à un proche (texte seulement)
        </span>
      </span>
    </button>
  );
}

export default ShareButton;
