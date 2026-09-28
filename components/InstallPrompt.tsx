"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Chrome/Android fires this before showing its own install banner (not in the TS DOM lib).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "qra-install-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad Safari has no install event: we show a short "Share → Add to Home Screen" hint instead.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};
// "none" on the server and when already installed / dismissed.
const readMode = (): "ios" | "maybe" | "none" =>
  isStandalone() || readDismissed() ? "none" : isIosSafari() ? "ios" : "maybe";
const serverMode = () => "none" as const;

/** 📲 Install card: Android/Chrome uses the real install prompt, iOS gets a hint. Hidden once installed. */
export function InstallPrompt() {
  const { t } = useLang();
  const mode = useSyncExternalStore(noSubscribe, readMode, serverMode);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's mini-bar away; we show our own, bigger button
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable: hidden for this visit only
    }
  };

  if (closed || mode === "none") return null;
  if (mode === "maybe" && !deferred) return null;

  return (
    <aside className="install-card" aria-label={t("installTitle")}>
      <span className="install-icon" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
        <img src="/icon-192.png" alt="" width={48} height={48} />
      </span>
      <div className="install-text">
        <p className="install-title">{t("installTitle")}</p>
        <p className="install-sub">
          {mode === "ios" ? (
            <>
              <Share size={16} strokeWidth={2.5} aria-hidden="true" /> {t("installIos")}
            </>
          ) : (
            t("installText")
          )}
        </p>
      </div>
      {mode !== "ios" && deferred && (
        <button
          type="button"
          className="btn btn-primary install-btn"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice.catch(() => undefined);
            setDeferred(null);
          }}
        >
          <Download size={20} strokeWidth={2.5} aria-hidden="true" /> {t("installBtn")}
        </button>
      )}
      <button type="button" className="install-close" onClick={close} aria-label={t("dismiss")}>
        <X size={20} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </aside>
  );
}

export default InstallPrompt;
