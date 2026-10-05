// POST /api/locate — "show me where": where are the amount, deadline and sender printed on the photo?
// Body: { imageBase64, mimeType, targets: { amount?, deadline?, sender? }, width?, height? }
// → { boxes: [{ field, x, y, w, h }], provider }   (fractions of the image, origin top-left)
// The photo is only forwarded to the AI provider, never stored or logged.
import { cleanTargets, locateFields } from "@/lib/locate";

export const runtime = "nodejs";
export const maxDuration = 40;

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
  console.warn(JSON.stringify({ route: "locate", error, detail }));
  return Response.json({ error }, { status });
}

const positive = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited");

  let body: { imageBase64?: unknown; mimeType?: unknown; targets?: unknown; width?: unknown; height?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const b64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^,]*,/, "").replace(/\s/g, "") : "";
  const targets = cleanTargets(body.targets);
  if (!MIME_TYPES.includes(mimeType) || !b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || !targets) return fail(400, "invalid_input");
  if (Math.floor((b64.length * 3) / 4) > MAX_IMAGE_BYTES) return fail(413, "image_too_large");

  const started = Date.now();
  try {
    const { boxes, provider } = await locateFields(b64, mimeType, targets, { width: positive(body.width), height: positive(body.height) });
    console.info(JSON.stringify({ route: "locate", provider, found: boxes.map((b) => b.field), ms: Date.now() - started }));
    return Response.json({ boxes, provider });
  } catch (e) {
    return fail(502, "ai_unavailable", e instanceof Error ? e.message.slice(0, 200) : undefined);
  }
}
