"use client";

import { useState } from "react";
import {
  BellRing,
  CircleCheck,
  Clock,
  HeartPulse,
  Moon,
  Pill,
  Send,
  Sun,
  Sunrise,
  Sunset,
  TriangleAlert,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  FOOD_LABEL,
  SLOT_LABEL,
  SLOT_TIME,
  buildMedsIcs,
  bySlot,
  daysLabel,
  medsShareText,
  medsSpoken,
  type MedsResult,
  type Slot,
} from "@/lib/medsSchedule";
import ListenButton from "./ListenButton";
import styles from "./MedsCard.module.css";

const SLOT_ICON: Record<Slot, LucideIcon> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };
const time = (s: Slot) => `${SLOT_TIME[s].h}:${String(SLOT_TIME[s].m).padStart(2, "0")}`;

function downloadIcs(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "qra-lia-dwa.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function share(text: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Qra Lia", text });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (!window.open(url, "_blank", "noopener,noreferrer")) window.location.href = url;
}

/** 💊 The medicine schedule: day plan by time, each medicine, voice, calendar reminders, family share. */
export default function MedsCard({ result, onRetake }: { result: MedsResult; onRetake: () => void }) {
  const { lang, t } = useLang();
  const [reminded, setReminded] = useState(false);
  const day = bySlot(result.medicines);

  return (
    <div className={`result ${styles.meds}`}>
      <ListenButton text={medsSpoken(result, lang)} label={t("medsListen")} sub="Écouter le traitement" />

      <div className={`safety safety-urgent ${styles.safety}`} role="note">
        <span className="safety-icon" aria-hidden="true">
          <HeartPulse size={22} strokeWidth={2.3} />
        </span>
        <p>
          {t("medsSafety")}
          {result.confidence < 0.6 && <strong className={styles.unsure}> {t("medsUnsure")}</strong>}
        </p>
      </div>

      {day.length > 0 && (
        <section className={`card ${styles.day}`} aria-labelledby="meds-day">
          <h2 id="meds-day" className="card-label">
            <Clock size={20} strokeWidth={2.4} aria-hidden="true" /> {t("medsDay")}
          </h2>
          <ol className={styles.timeline}>
            {day.map(({ slot, meds }) => {
              const Icon = SLOT_ICON[slot];
              return (
                <li key={slot} className={styles[slot]}>
                  <span className={styles.slotIcon} aria-hidden="true">
                    <Icon size={26} strokeWidth={2.2} />
                  </span>
                  <div className={styles.slotBody}>
                    <p className={styles.slotName}>
                      {SLOT_LABEL[lang][slot]} <span className={styles.slotTime}>{time(slot)}</span>
                    </p>
                    <ul className={styles.pills}>
                      {meds.map((m) => (
                        <li key={m.name}>
                          <Pill size={16} strokeWidth={2.4} aria-hidden="true" />
                          {/* French medicine names inside Arabic text: isolate as one left-to-right run */}
                          <bdi dir="ltr" className={styles.pillText}>
                            <strong>{m.name}</strong>
                            {m.dose ? ` — ${m.dose}` : ""}
                          </bdi>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-labelledby="meds-list" className={styles.list}>
        <h2 id="meds-list" className={styles.listTitle}>
          {t("medsList")}
        </h2>
        {result.medicines.map((m, i) => (
          <article key={`${m.name}-${i}`} className={`card ${styles.med}`}>
            <span className={styles.num} aria-hidden="true">
              {i + 1}
            </span>
            <div className={styles.medBody}>
              <p className={styles.medName} dir="auto">
                {m.name}
              </p>
              {m.dose && (
                <p className={styles.medDose} dir="auto">
                  {m.dose}
                </p>
              )}
              <ul className={styles.facts}>
                {m.slots.map((s) => {
                  const Icon = SLOT_ICON[s];
                  return (
                    <li key={s} className={styles[s]}>
                      <Icon size={16} strokeWidth={2.4} aria-hidden="true" /> {SLOT_LABEL[lang][s]}
                    </li>
                  );
                })}
                {m.slots.length === 0 && <li className={styles.ifNeeded}>{t("medsIfNeeded")}</li>}
                {m.food && (
                  <li>
                    <Utensils size={16} strokeWidth={2.4} aria-hidden="true" /> {FOOD_LABEL[lang][m.food]}
                  </li>
                )}
                {m.duration_days && (
                  <li>
                    <CircleCheck size={16} strokeWidth={2.4} aria-hidden="true" /> {daysLabel(m.duration_days, lang)}
                  </li>
                )}
              </ul>
              {m.note && (
                <p className={styles.note} dir="auto">
                  {m.note}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      {result.warnings.length > 0 && (
        <div className="card">
          <p className="card-label">
            <TriangleAlert size={20} strokeWidth={2.4} aria-hidden="true" /> {t("medsWarnings")}
          </p>
          <ul className="reasons" dir="auto">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card summary">
        <p className="summary-text">{result.summary}</p>
      </div>

      <div className="actions">
        {day.length > 0 && (
          <button
            type="button"
            className="feature-btn feature-btn-remind"
            onClick={() => {
              downloadIcs(buildMedsIcs(result, lang));
              setReminded(true);
            }}
          >
            <span className="feature-btn-icon" aria-hidden="true">
              <BellRing size={24} strokeWidth={2.3} />
            </span>
            <span className="feature-btn-text">
              <span className="feature-btn-label">{t("medsRemind")}</span>
              <span className="feature-btn-sub" lang="fr">
                Rappel à chaque prise
              </span>
            </span>
          </button>
        )}
        {reminded && (
          <p className="feature-toast" role="status">
            <CircleCheck size={18} strokeWidth={2.5} aria-hidden="true" /> {t("medsReminded")}
          </p>
        )}
        <button type="button" className="feature-btn feature-btn-share" onClick={() => void share(medsShareText(result, lang))}>
          <span className="feature-btn-icon" aria-hidden="true">
            <Send size={24} strokeWidth={2.3} className="flip-rtl" />
          </span>
          <span className="feature-btn-text">
            <span className="feature-btn-label">{t("medsShare")}</span>
            <span className="feature-btn-sub" lang="fr">
              Envoyer à un proche (texte seulement)
            </span>
          </span>
        </button>
      </div>

      <button type="button" className="btn btn-ghost btn-block btn-lg" onClick={onRetake}>
        <Pill size={22} strokeWidth={2.3} aria-hidden="true" /> {t("medsAgain")}
      </button>
    </div>
  );
}
