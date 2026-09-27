// Evaluate /api/read on the private test set and write docs/test-results.md.
//
//   npx tsx scripts/eval.ts                         (default: https://qra-lia.vercel.app/api/read)
//   EVAL_URL=http://localhost:3000/api/read npx tsx scripts/eval.ts
//
// test-docs/ is PRIVATE (gitignored): photos with personal data covered + expected.json:
//   [{ "file": "01-onee.jpg", "status": "ok", "amount": 340, "deadline": "2026-10-15", "scam": false },
//    { "file": "16-flou.jpg", "status": "unreadable" }, { "file": "18-mur.jpg", "status": "not_a_document" }]
// Never prints extracted text or the Darija summary (personal data).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { ReadResult } from "../lib/types";

type Expected = {
  file: string;
  status: ReadResult["status"];
  amount?: number | null;
  deadline?: string | null;
  scam?: boolean;
};

type Row = {
  file: string;
  expected: Expected;
  got: ReadResult | null;
  httpStatus: number;
  error?: string;
  latencyMs: number;
  statusOk: boolean;
  amountOk: boolean | null;
  deadlineOk: boolean | null;
  scamOk: boolean | null;
};

const URL = process.env.EVAL_URL ?? "https://qra-lia.vercel.app/api/read";
const DIR = process.env.EVAL_DIR ?? "test-docs";
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 2000);
const MIME: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mark = (v: boolean | null) => (v === null ? "—" : v ? "✅" : "❌");
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function evaluate(exp: Expected): Promise<Row> {
  const mimeType = MIME[extname(exp.file).toLowerCase()] ?? "image/jpeg";
  const imageBase64 = readFileSync(join(DIR, exp.file)).toString("base64");
  const started = Date.now();
  let got: ReadResult | null = null;
  let httpStatus = 0;
  let error: string | undefined;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
      signal: AbortSignal.timeout(60_000),
    });
    httpStatus = res.status;
    const body = await res.json();
    if (res.ok) got = body as ReadResult;
    else error = body?.error ?? `http ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.name : "error";
  }
  const latencyMs = Date.now() - started;

  const statusOk = got?.status === exp.status;
  const isOkDoc = exp.status === "ok";
  const amountOk =
    isOkDoc && exp.amount !== undefined
      ? exp.amount === null
        ? got?.amount == null
        : got?.amount != null && Math.abs(got.amount.value - exp.amount) <= 1
      : null;
  const deadlineOk =
    isOkDoc && exp.deadline !== undefined ? (got?.deadline ?? null) === (exp.deadline ?? null) : null;
  const scamOk = exp.scam !== undefined ? got?.scam_suspected === exp.scam : null;

  return { file: exp.file, expected: exp, got, httpStatus, error, latencyMs, statusOk, amountOk, deadlineOk, scamOk };
}

function report(rows: Row[]): string {
  const lines = [
    `| file | status | amount | deadline | scam | provider | latency |`,
    `|---|---|---|---|---|---|---|`,
    ...rows.map(
      (r) =>
        `| ${r.file} | ${mark(r.statusOk)} ${r.got?.status ?? r.error ?? "?"} | ${mark(r.amountOk)} | ${mark(r.deadlineOk)} | ${mark(r.scamOk)} | ${r.got?.provider ?? "—"} | ${(r.latencyMs / 1000).toFixed(1)} s |`,
    ),
  ];

  const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  const docs = rows.filter((r) => r.expected.status === "ok");
  const withAmount = docs.filter((r) => r.amountOk !== null);
  const withDeadline = docs.filter((r) => r.deadlineOk !== null);
  const bad = rows.filter((r) => r.expected.status === "unreadable");
  const nonDocs = rows.filter((r) => r.expected.status === "not_a_document");
  const scams = rows.filter((r) => r.expected.scam === true);
  const notScams = rows.filter((r) => r.expected.scam === false);
  const ok = rows.filter((r) => r.got);

  const summary = [
    `Documents read correctly: ${count((r) => r.expected.status === "ok" && r.statusOk)}/${docs.length}`,
    `Amount correct: ${withAmount.filter((r) => r.amountOk).length}/${withAmount.length} · Deadline correct: ${withDeadline.filter((r) => r.deadlineOk).length}/${withDeadline.length}`,
    `Bad photos correctly refused: ${bad.filter((r) => r.statusOk).length}/${bad.length} · Non-documents refused: ${nonDocs.filter((r) => r.statusOk).length}/${nonDocs.length}`,
    `Scams flagged: ${scams.filter((r) => r.got?.scam_suspected).length}/${scams.length} · False scam alarms: ${notScams.filter((r) => r.got?.scam_suspected).length}/${notScams.length}`,
    `Median latency: ${(median(ok.map((r) => r.latencyMs)) / 1000).toFixed(1)} s · Fallback (Groq) used: ${count((r) => r.got?.provider === "groq")} time(s) · Errors: ${count((r) => !r.got)}`,
  ];

  return [
    `# Test results — Qra Lia`,
    ``,
    `Run: ${new Date().toISOString()} · Endpoint: ${URL} · ${rows.length} images (personal data covered before photographing).`,
    ``,
    "```",
    ...summary,
    "```",
    ``,
    ...lines,
    ``,
  ].join("\n");
}

async function main() {
  const expected = JSON.parse(readFileSync(join(DIR, "expected.json"), "utf8")) as Expected[];
  const rows: Row[] = [];
  for (const [i, exp] of expected.entries()) {
    const row = await evaluate(exp);
    rows.push(row);
    console.log(`${String(i + 1).padStart(2)}/${expected.length} ${exp.file}: ${row.got?.status ?? row.error} (${(row.latencyMs / 1000).toFixed(1)} s)`);
    if (i < expected.length - 1) await sleep(PAUSE_MS); // one at a time: free-tier rate limits
  }
  const md = report(rows);
  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/test-results.md", md);
  console.log(`\n${md}\nWritten to docs/test-results.md`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
