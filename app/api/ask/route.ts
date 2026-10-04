// POST /api/ask — follow-up question about a paper already read.
// Body: { question, context: <fields from /api/read>, lang? } → { answer, provider }
import { answerQuestion, cleanContext } from "@/lib/ask";
import { parseLang } from "@/lib/lang";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_QUESTION = 500;
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
  // Never log the question or the paper.
  console.warn(JSON.stringify({ route: "ask", error, detail }));
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited");

  let body: { question?: unknown; context?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_input");
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const context = cleanContext(body.context);
  if (!question || question.length > MAX_QUESTION || !context) return fail(400, "invalid_input");
  const lang = parseLang(body.lang);

  const started = Date.now();
  try {
    const { answer, provider } = await answerQuestion(question, context, lang);
    console.info(JSON.stringify({ route: "ask", provider, ms: Date.now() - started }));
    return Response.json({ answer, provider });
  } catch (e) {
    return fail(502, "ai_unavailable", e instanceof Error ? e.message.slice(0, 200) : undefined);
  }
}
