"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef } from "react";
import { useSearchParams } from "next/navigation";
import UploadPanel from "@/components/UploadPanel";
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
  | { screen: "result"; result: ReadResult }
  | { screen: "error"; error: ErrorStateKind };

type Action =
  | { type: "PHOTO_CHOSEN" }
  | { type: "COMPRESSED"; previewUrl: string }
  | { type: "RESULT_OK"; result: ReadResult }
  | { type: "RESULT_UNREADABLE" }
  | { type: "RESULT_NOT_A_DOCUMENT" }
  | { type: "API_ERROR"; error: ClientError }
  | { type: "RETRY" };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "PHOTO_CHOSEN":
      return { screen: "compressing" };
    case "COMPRESSED":
      return { screen: "uploading", previewUrl: action.previewUrl };
    case "RESULT_OK":
      return { screen: "result", result: action.result };
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

        // Dev-only mock switch: ?mock=ok|unreadable|scam
        const mockParam = searchParams?.get("mock") ?? null;
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
    [searchParams]
  );

  const handleRetake = useCallback(() => {
    dispatch({ type: "RETRY" });
  }, []);

  return (
    <main className="page">
      {state.screen === "idle" && <UploadPanel onFileChosen={handleFileChosen} />}

      {state.screen === "compressing" && <Loading />}

      {state.screen === "uploading" && <Loading previewUrl={state.previewUrl} />}

      {state.screen === "result" && (
        <ResultCard result={state.result} onRetake={handleRetake} />
      )}

      {state.screen === "error" && (
        <ErrorState error={state.error} onRetry={handleRetake} />
      )}
    </main>
  );
}
