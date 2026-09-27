import assert from "node:assert/strict";
import { test } from "node:test";
import { extractWithGroq } from "./groq";

const OK_JSON = JSON.stringify({
  status: "not_a_document", doc_type: null, sender: null, amount: null, deadline: null, action: null,
  risk_level: "low", risk_reasons: [], scam_suspected: false, confidence: 0.9, darija_summary: "x",
});

function mockFetch(responses: Response[]) {
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const next = responses.shift();
    if (!next) throw new Error("unexpected call");
    return next;
  }) as typeof fetch;
  return bodies;
}

const ok = () => Response.json({ choices: [{ message: { content: OK_JSON } }] });

test("groq caps output tokens under the free-tier limit", async () => {
  process.env.GROQ_API_KEY = "test";
  const bodies = mockFetch([ok()]);
  await extractWithGroq("AAAA", "image/jpeg");
  assert.ok(Number(bodies[0].max_completion_tokens) <= 900);
});

test("groq retries once after a 429 with a short retry-after", async () => {
  process.env.GROQ_API_KEY = "test";
  const limited = Response.json({ error: { message: "rate limit" } }, { status: 429, headers: { "retry-after": "0.05" } });
  const bodies = mockFetch([limited, ok()]);
  const out = await extractWithGroq("AAAA", "image/jpeg");
  assert.equal(out.status, "not_a_document");
  assert.equal(bodies.length, 2);
});

test("groq drops reasoning_effort when the model rejects it", async () => {
  process.env.GROQ_API_KEY = "test";
  const rejected = Response.json({ error: { message: "`reasoning_effort` is not supported with this model" } }, { status: 400 });
  const bodies = mockFetch([rejected, ok()]);
  await extractWithGroq("AAAA", "image/jpeg");
  assert.equal(bodies[0].reasoning_effort, "none");
  assert.equal(bodies[1].reasoning_effort, undefined);
});
