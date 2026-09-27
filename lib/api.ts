import type { ApiError, ReadRequest, ReadResult } from "./types";

/** ApiError from the server, or the frontend-only "network" code (not part of the shared contract). */
export type ClientError = ApiError | { error: "network"; darija_message?: undefined };

// Server worst case: Gemini (16 s budget) + Groq fallback (12 s) + upload time on a slow phone network.
const TIMEOUT_MS = 45_000;

/**
 * Calls POST /api/read with the compressed photo.
 * Throws an ApiError-shaped object on any failure:
 *  - non-200 response → the parsed ApiError from the body
 *  - network failure / timeout → { error: "network" }
 */
export async function readDocument(req: ReadRequest): Promise<ReadResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/api/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok) {
      let parsed: ApiError;
      try {
        parsed = (await res.json()) as ApiError;
      } catch {
        parsed = { error: "internal" };
      }
      throw parsed;
    }

    return (await res.json()) as ReadResult;
  } catch (err) {
    // Already a well-formed ApiError we threw above
    if (err && typeof err === "object" && "error" in err) {
      throw err as ApiError;
    }
    // AbortError (timeout) or any other network failure
    throw { error: "network" } satisfies ClientError;
  } finally {
    clearTimeout(timeoutId);
  }
}
