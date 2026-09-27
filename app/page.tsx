"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef } from "react";
import { useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import Landing from "@/components/Landing";
import Loading from "@/components/Loading";
import ResultCard from "@/components/ResultCard";
import ErrorState, { ErrorStateKind } from "@/components/ErrorState";
import { compressImage } from "@/lib/compress";
import { readDocument, type ClientError } from "@/lib/api";
import { MOCK_OK, MOCK_SCAM, MOCK_UNREADABLE } from "@/lib/mock";
import type { ReadResult } from "@/lib/types";

type State =
  | { screen: "idle" }
  | { screen: "compressing" }
  | { screen: "uploading"; previewUrl: string }
  | { screen: "result"; result: ReadResult; previewUrl: string | null }
  | { screen: "error"; error: ErrorStateKind };

type Action =
  | { type: "PHOTO_CHOSEN" }
  | { type: "COMPRESSED"; previewUrl: string }
  | { type: "RESULT_OK"; result: ReadResult }
  | { type: "RESULT_UNREADABLE" }
  | { type: "RESULT_NOT_A_DOCUMENT" }
  | { type: "API_ERROR"; error: ClientError }
  | { type: "RETRY" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "PHOTO_CHOSEN":
      return { screen: "compressing" };
    case "COMPRESSED":
      return { screen: "uploading", previewUrl: action.previewUrl };
    case "RESULT_OK":
      return {
        screen: "result",
        result: action.result,
        previewUrl: state.screen === "uploading" ? state.previewUrl : null,
      };
    case "RESULT_UNREADABLE":
      return { screen: "error", error: { kind: "unreadable" } };
    case "RESULT_NOT_A_DOCUMENT":
      return { screen: "error", error: { kind: "not_a_document" } };
    case "API_ERROR":
      return { screen: "error", error: { kind: "api", error: action.error } };
    case "RETRY":
      return { screen: "idle" };
  }
}

function mockForParam(value: string | null): ReadResult | null {
  switch (value) {
    case "ok":
      return MOCK_OK;
    case "unreadable":
      return MOCK_UNREADABLE;
    case "scam":
      return MOCK_SCAM;
    default:
      return null;
  }
}

export default function Page() {
  return (
    // useSearchParams (for ?mock=...) needs a Suspense boundary in the App Router.
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const [state, dispatch] = useReducer(reducer, { screen: "idle" });
  const searchParams = useSearchParams();
  const previewUrlRef = useRef<string | null>(null);
  const mockParam = searchParams?.get("mock") ?? null;
  const isDemo = mockForParam(mockParam) !== null;

  // Every screen change starts at the top (the landing page is long).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen]);

  // Revoke the thumbnail object URL whenever we leave the result screen.
  useEffect(() => {
    if (state.screen !== "uploading" && state.screen !== "result") {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    }
  }, [state.screen]);

  const handleFileChosen = useCallback(
    async (file: File) => {
      dispatch({ type: "PHOTO_CHOSEN" });

      try {
        const { base64, mimeType, previewUrl } = await compressImage(file);
        previewUrlRef.current = previewUrl;
        dispatch({ type: "COMPRESSED", previewUrl });

        // Demo-only mock switch: ?mock=ok|unreadable|scam (a DEMO banner is shown)
        const mock = mockForParam(mockParam);

        const result = mock ?? (await readDocument({ imageBase64: base64, mimeType }));

        if (result.status === "unreadable") {
          dispatch({ type: "RESULT_UNREADABLE" });
        } else if (result.status === "not_a_document") {
          dispatch({ type: "RESULT_NOT_A_DOCUMENT" });
        } else {
          dispatch({ type: "RESULT_OK", result });
        }
      } catch (err) {
        dispatch({ type: "API_ERROR", error: err as ClientError });
      }
    },
    [mockParam]
  );

  const handleRetake = useCallback(() => {
    dispatch({ type: "RETRY" });
  }, []);

  const busy = state.screen === "compressing" || state.screen === "uploading";

  return (
    <>
      {isDemo && (
        <div className="demo-banner" role="note">
          🧪 DEMO — نتيجة تجريبية، ماشي قراية حقيقية
        </div>
      )}

      <header className="topbar">
        <div className="container topbar-inner">
          <button
            type="button"
            className="brand"
            onClick={handleRetake}
            disabled={busy}
            aria-label="Qra Lia — الرئيسية"
          >
            <BrandMark />
            <span className="brand-name">
              <strong>اقرا ليا</strong>
              <span>Qra Lia</span>
            </span>
          </button>
          {state.screen !== "idle" && !busy && (
            <button type="button" className="topbar-chip" onClick={handleRetake}>
              <span aria-hidden="true">📸</span> ورقة جديدة
            </button>
          )}
          {state.screen === "idle" && <span className="topbar-chip">🔒 بلا تسجيل</span>}
        </div>
      </header>

      <main>
        {state.screen === "idle" && <Landing onFileChosen={handleFileChosen} />}

        {state.screen !== "idle" && (
          <div className="app-column">
            {state.screen === "compressing" && <Loading />}

            {state.screen === "uploading" && <Loading previewUrl={state.previewUrl} />}

            {state.screen === "result" && (
              <ResultCard result={state.result} previewUrl={state.previewUrl} onRetake={handleRetake} />
            )}

            {state.screen === "error" && <ErrorState error={state.error} onRetry={handleRetake} />}
          </div>
        )}
      </main>
    </>
  );
}
