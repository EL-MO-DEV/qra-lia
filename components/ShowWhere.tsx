"use client";

import { useRef, useState } from "react";
import { Banknote, Building2, CalendarDays, EyeOff, Loader2, ScanSearch, type LucideIcon } from "lucide-react";
import { useLang, type StringKey } from "@/lib/i18n";
import { formatAmount, formatDeadline } from "@/lib/share";
import type { ReadResult } from "@/lib/types";
import styles from "./ShowWhere.module.css";

type Field = "amount" | "deadline" | "sender";
type Box = { field: Field; x: number; y: number; w: number; h: number };
type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; boxes: Box[] } | { kind: "error" };

const FIELDS: Record<Field, { label: StringKey; Icon: LucideIcon }> = {
  amount: { label: "fieldAmount", Icon: Banknote },
  deadline: { label: "fieldDeadline", Icon: CalendarDays },
  sender: { label: "fieldSender", Icon: Building2 },
};

/** The local photo (object URL) → base64 without the data: prefix. Nothing leaves the phone until the tap. */
async function urlToBase64(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 📍 "Show me where it's written": highlights the amount, deadline and sender on the user's own photo,
 * so they can check the AI's answer with their own eyes (or show it to someone).
 */
export default function ShowWhere({ result, previewUrl }: { result: ReadResult; previewUrl: string }) {
  const { lang, t } = useLang();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const figureRef = useRef<HTMLElement>(null);

  const values: Partial<Record<Field, string>> = {
    ...(result.amount ? { amount: formatAmount(result.amount, lang) } : {}),
    ...(result.deadline ? { deadline: formatDeadline(result.deadline, lang) } : {}),
    ...(result.sender ? { sender: result.sender } : {}),
  };
  if (!Object.keys(values).length) return null;

  const locate = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: await urlToBase64(previewUrl),
          mimeType: "image/jpeg",
          targets: {
            ...(result.amount ? { amount: `${result.amount.value} ${result.amount.currency}` } : {}),
            ...(result.deadline ? { deadline: result.deadline } : {}),
            ...(result.sender ? { sender: result.sender } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { boxes } = (await res.json()) as { boxes: Box[] };
      setState({ kind: "done", boxes });
      setOpen(true);
      requestAnimationFrame(() => figureRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch {
      setState({ kind: "error" });
    }
  };

  const onClick = () => {
    if (state.kind === "loading") return;
    if (state.kind === "done") setOpen((o) => !o);
    else void locate();
  };

  const loading = state.kind === "loading";
  const showing = state.kind === "done" && open;

  return (
    <div className={styles.wrap}>
      <button type="button" className="feature-btn" onClick={onClick} aria-expanded={showing}>
        <span className="feature-btn-icon" aria-hidden="true">
          {loading ? (
            <Loader2 size={24} strokeWidth={2.4} className="spin" />
          ) : showing ? (
            <EyeOff size={24} strokeWidth={2.3} />
          ) : (
            <ScanSearch size={24} strokeWidth={2.3} />
          )}
        </span>
        <span className="feature-btn-text">
          <span className="feature-btn-label">{loading ? t("showWhereLoading") : showing ? t("showWhereHide") : t("showWhere")}</span>
          <span className="feature-btn-sub" lang="fr">
            Où est-ce écrit sur le papier ?
          </span>
        </span>
      </button>

      {state.kind === "error" && (
        <p className="feature-note" role="status">
          {t("showWhereError")}
        </p>
      )}

      {showing && state.boxes.length === 0 && (
        <p className="feature-note" role="status">
          {t("showWhereNone")}
        </p>
      )}

      {showing && state.boxes.length > 0 && (
        <figure className={styles.figure} ref={figureRef}>
          <figcaption className={styles.title}>{t("showWhereTitle")}</figcaption>
          <div className={styles.frame}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL of the user's photo */}
            <img src={previewUrl} alt="" className={styles.photo} />
            {state.boxes.map((b) => {
              const { Icon } = FIELDS[b.field];
              return (
                <span
                  key={b.field}
                  className={`${styles.box} ${styles[b.field]}`}
                  // Physical left/top: the photo isn't mirrored in RTL.
                  style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
                >
                  {/* Tag outside the box, on the side with more room, so it never hides the value itself */}
                  <span className={`${styles.tag} ${b.x + b.w / 2 > 0.5 ? styles.tagBefore : styles.tagAfter}`} aria-hidden="true">
                    <Icon size={14} strokeWidth={2.6} />
                  </span>
                </span>
              );
            })}
          </div>
          <ul className={styles.legend}>
            {state.boxes.map((b) => {
              const { label, Icon } = FIELDS[b.field];
              return (
                <li key={b.field} className={styles[b.field]}>
                  <span className={styles.dot} aria-hidden="true">
                    <Icon size={16} strokeWidth={2.5} />
                  </span>
                  <span>
                    <strong>{t(label)}:</strong> {values[b.field]}
                  </span>
                </li>
              );
            })}
          </ul>
        </figure>
      )}
    </div>
  );
}
