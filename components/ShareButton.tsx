"use client";

import { shareResult } from "@/lib/share";
import type { ReadResult } from "@/lib/types";

type Props = { result: ReadResult };

export function ShareButton({ result }: Props) {
  return (
    <button type="button" className="feature-btn" onClick={() => void shareResult(result)}>
      <span className="feature-btn-icon" aria-hidden="true">
        📤
      </span>
      <span className="feature-btn-text">
        <span className="feature-btn-label">صيفط لشي حد من العائلة</span>
        <span className="feature-btn-sub" lang="fr">
          Envoyer à un proche (texte seulement)
        </span>
      </span>
    </button>
  );
}

export default ShareButton;
