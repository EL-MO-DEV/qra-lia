// POST /api/meds — photo of a prescription or medicine box → simple daily schedule.
// Body: { imageBase64, mimeType, lang? } → MedsResult. The photo is never stored or logged.
import { parseLang } from "@/lib/lang";
import { readMeds } from "@/lib/meds";

export const runtime = "nodejs";
export const maxDuration = 45;

const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const RATE_LIMIT_PER_MINUTE = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

function fail(status: number, error: string, detail?: string) {
  // Never log the photo or any medicine name.
  console.warn(JSON.stringify({ route: "meds", error, detail }));
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited");

  let body: { imageBase64?: unknown; mimeType?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const b64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^,]*,/, "").replace(/\s/g, "") : "";
  if (!MIME_TYPES.includes(mimeType) || !b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return fail(400, "invalid_input");
  if (Math.floor((b64.length * 3) / 4) > MAX_IMAGE_BYTES) return fail(413, "image_too_large");

  try {
    const result = await readMeds(b64, mimeType, parseLang(body.lang));
    console.info(JSON.stringify({ route: "meds", status: result.status, kind: result.kind, count: result.medicines.length, provider: result.provider, latency_ms: result.latency_ms }));
    return Response.json(result);
  } catch (e) {
    return fail(502, "ai_unavailable", e instanceof Error ? e.message.slice(0, 200) : undefined);
  }
}
