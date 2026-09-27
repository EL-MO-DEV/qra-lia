# CDC — Backend & AI · Qra Lia (اقرا ليا)

> Specification for **Role 2: Backend / AI**. Read it fully before coding.
> Tech lead / integrator: **Moncef** (only person who merges into `main` and holds production keys).
> Hackathon: GOMYCODE × NVIDIA "Come Build with AI" — Sunday 27 Sept 2026 — submission 17:30 (Morocco time).
> **Team of 3:** Moncef (Tech Lead + Features/PWA + QA/Delivery), Backend/AI, Frontend Core. Only edit the files listed as yours below; if you need a change in someone else's file, ask them in the group.

---

## 1. Goal

Build the single API endpoint that turns a **photo of a paper document** into **structured, verified JSON + a Darija explanation**.

Everything the user sees (result card, voice, reminder, share) depends on this JSON. **Correct and honest > fast > fancy.**

---

## 2. Scope

**You own (only you edit these):**
```
app/api/read/route.ts   # the endpoint
lib/gemini.ts           # primary provider
lib/groq.ts             # fallback provider
lib/prompt.ts           # system prompt
lib/schema.ts           # zod schema + JSON schema for the model
lib/mask.ts             # masking of ID / bank / card numbers
lib/rules.ts            # deterministic risk rules
lib/*.test.ts           # small unit tests for mask + rules
```
**Shared, owned by Moncef:** `lib/types.ts` (the contract). Need a change? Ask him.

**Out of scope:** UI, TTS, share, reminder, PWA, database, auth, file storage.

**Note:** Moncef keeps a minimal safety-net version of `/api/read` on a separate branch. It is only merged if your PR isn't working at the 13:00 integration — then you keep improving on your branch and your version replaces it once it passes. It's insurance for the team, not a competition.

---

## 3. Stack

- Next.js (App Router) Route Handler, TypeScript, **Node.js runtime** (not Edge).
- `zod` for validation.
- Google Gen AI SDK for JavaScript (Gemini). Check the current package name and docs before installing.
- Groq SDK (or plain `fetch` to Groq's OpenAI-compatible endpoint).
- Deployed on Vercel. Check the plan's function limits: **request body size** (keep images small) and **max duration** (set `export const maxDuration` in the route accordingly).

### Environment variables
```
GEMINI_API_KEY=
GEMINI_MODEL=      # a current fast, vision-capable Gemini model
GROQ_API_KEY=
GROQ_MODEL=        # a vision-capable model available on your Groq account
```
- Locally: your own free keys in `.env.local` (never committed, never shared in the group).
- Production keys: set by Moncef in Vercel only.
- Commit `.env.example` with empty values.

---

## 4. API contract

### Request
`POST /api/read` · `Content-Type: application/json`
```json
{ "imageBase64": "<base64 without data: prefix>", "mimeType": "image/jpeg" }
```
Accepted mime types: `image/jpeg`, `image/png`, `image/webp`. The frontend compresses to max 1600px / JPEG ~0.8, so the payload should stay well under ~3 MB.

### Response (HTTP 200)
```ts
type ReadResult = {
  status: "ok" | "unreadable" | "not_a_document";
  doc_type: string | null;          // "facture électricité", "lettre banque"...
  sender: string | null;            // "ONEE", "Lydec", "CNSS"...
  amount: { value: number; currency: "MAD" | string } | null;
  deadline: string | null;          // ISO date "2026-10-15"
  days_left: number | null;         // computed by server, not by the model
  action: string | null;            // what to do now (short)
  risk_level: "low" | "medium" | "high";
  risk_reasons: string[];
  scam_suspected: boolean;
  confidence: number;               // 0..1
  darija_summary: string;           // Darija in Arabic script, 3–5 short sentences
  provider: "gemini" | "groq";
  latency_ms: number;
};
```
Rules:
- Any field not clearly visible in the document is `null`. **Never guessed.**
- `status: "unreadable"` / `"not_a_document"` still returns 200 with a Darija message in `darija_summary`, e.g. `"الصورة ما واضحاش. عاود صوّر فضو مزيان."`

### Errors
| HTTP | When | Body |
|---|---|---|
| 400 | Missing/invalid body or mime type | `{ "error": "invalid_input" }` |
| 413 | Image too large | `{ "error": "image_too_large" }` |
| 429 | Rate limit hit (see §9) | `{ "error": "rate_limited" }` |
| 502 | Both providers failed | `{ "error": "ai_unavailable", "darija_message": "ما قدرناش نقراو الورقة دابا، عاود من بعد شوية." }` |
| 500 | Unexpected | `{ "error": "internal" }` |

**Push a working mock of this contract early** so the frontend is never blocked.

---

## 5. Processing pipeline

```
1. Validate body (zod): base64 present, mime allowed, size limit
2. Call Gemini (structured JSON output, timeout 15 s via AbortController)
3. Parse + validate with zod
      └─ invalid JSON → retry ONCE with "Return only valid JSON matching the schema"
4. Gemini failed (timeout / 429 / 5xx / invalid twice) → call Groq with the same prompt
5. Groq failed too → 502 ai_unavailable
6. mask.ts   → mask sensitive numbers in every string field (defense in depth)
7. rules.ts  → compute days_left, apply deterministic risk rules (§6)
8. Add provider + latency_ms → return 200
```
Never send the image anywhere else. Never write it to disk.

---

## 6. Risk logic (model + code rules)

The model proposes `risk_level`, `risk_reasons`, `scam_suspected`. Then `rules.ts` applies fixed rules. **Final risk = the higher of the two.** Add a reason for every rule that fires.

| Rule | Effect |
|---|---|
| `days_left < 0` | high · reason "الأجل فات" |
| `0 ≤ days_left ≤ 3` | at least high · reason "بقاو غير أيام قلال" |
| `4 ≤ days_left ≤ 7` | at least medium |
| Text mentions tribunal / huissier / recouvrement / coupure / mise en demeure (FR or AR) | at least high |
| Scam signs: card code/CVV, password/OTP request, transfer to a personal account, shortened or odd links (bit.ly…), "urgent" + prize/gain wording | `scam_suspected = true`, high |
| `confidence < 0.6` | reason "تأكد مع شي حد" (UI shows a yellow banner) |

Keyword lists live in `rules.ts` as arrays (French + Arabic + Darija variants), easy to extend.
The app **never** says a document is 100% safe.

---

## 7. Masking (`lib/mask.ts`)

Keep only the last 4 characters: `••••1234`.

| Data | Pattern idea (refine with tests) |
|---|---|
| Moroccan CIN | 1–2 letters + 5–6 digits (e.g. `AB123456`) |
| RIB | 24 digits (spaces allowed) |
| IBAN | `MA` + 26 digits (spaces allowed) |
| Card number | 13–19 digits (spaces/dashes allowed) |
| Contract / client numbers | leave as is (users need them to pay) |

Apply to every string in the result, including `darija_summary`. The prompt also asks the model to mask (§8) — code masking is the safety net.

---

## 8. System prompt (`lib/prompt.ts`) — starting version

```
You read photos of official paper documents from Morocco (bills, bank letters,
CNSS, administration, school letters). Documents may be in French, Arabic or both.

Return ONLY JSON matching the schema. Rules:
1. Never invent information. If a field is not clearly visible, use null.
2. Blurry, cut off or unreadable image: status "unreadable".
   Not a document: status "not_a_document". Do not guess.
3. Mask CIN, RIB/IBAN, card and account numbers: keep only the last 4 characters.
4. darija_summary: Moroccan Darija in Arabic script, simple words, 3–5 short
   sentences, as if explaining to an elderly parent: what this paper is, who sent
   it, how much and by when, what to do now, what happens if ignored (only if the
   document says so).
5. Scam check: card code, password, urgent transfer, suspicious links or phone
   numbers → scam_suspected true + reasons.
6. No legal or medical advice. For court, debt-collection or medical papers, say
   the person should ask a trusted person or a professional.
7. confidence: honest 0–1 confidence that amount and deadline are correct.
8. Dates in ISO format (YYYY-MM-DD). Amounts as numbers in MAD when written in DH/MAD.
```
Pass the JSON schema to the model's structured-output option (do not ask the model for `days_left`, `provider`, `latency_ms` — the server computes them).

Tune the prompt at 15:00–16:15 using Moncef's eval results table. Keep a short changelog at the top of `prompt.ts` (what changed + why) — useful for the pitch.

---

## 9. Security & privacy

- Keys only in env vars, server side. Never log them, never return them.
- Logs: `requestId`, `status`, `provider`, `latency_ms`, error type. **Never** the image, the extracted text, names or numbers.
- Same-origin only (no open CORS).
- Simple in-memory rate limit per IP (e.g. 10 requests/minute). Best-effort is fine for the demo.
- Reject anything that is not an allowed image type.

---

## 10. Testing

**Unit tests (quick):** `mask.ts` (CIN, RIB, IBAN, card, and a normal sentence stays unchanged) and `rules.ts` (each rule in §6).

**Manual check with curl:**
```bash
B64=$(base64 -w0 test.jpg)
curl -s -X POST http://localhost:3000/api/read \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"$B64\",\"mimeType\":\"image/jpeg\"}" | jq
```
(macOS: `base64 -i test.jpg`)

**Fallback test:** set a wrong `GEMINI_API_KEY` locally → response must come from `groq`.

**Eval (run by Moncef):** `scripts/eval.ts` posts every image in `test-docs/` and compares to `expected.json`. Your response shape must never change without telling Moncef.

---

## 11. Timeline (event day)

| Time | Deliverable |
|---|---|
| 10:30 | Mock endpoint returning a valid fake `ReadResult` pushed (unblocks frontend) |
| 11:15–12:15 | Real Gemini call working on 3 documents |
| 12:15–13:00 | zod validation + retry + masking + rules |
| **13:00** | **First integration with the UI (PR to `main`)** |
| 13:45–14:45 | Groq fallback + timeouts + error codes + rate limit |
| 14:45–15:00 | Unit tests for mask + rules |
| **15:00** | **Feature freeze** |
| 15:30–16:15 | Prompt tuning with Moncef's eval results (no contract changes) |
| **16:15** | **Code freeze** |

Blocked for more than 20 minutes? Tell the group and Moncef, take the simpler option.

---

## 12. Git workflow

- Branch: `backend`. Small commits, clear messages (`feat(api): groq fallback`).
- Open a Pull Request to `main`; Moncef reviews and merges.
- Never commit `.env.local`, keys, or anything from `test-docs/`.

---

## 13. Definition of done ✅

- [ ] Endpoint returns a valid `ReadResult` for real documents (zod-validated)
- [ ] `unreadable` and `not_a_document` handled without guessing
- [ ] Groq fallback proven by the broken-key test
- [ ] Sensitive numbers masked in every field
- [ ] Deterministic risk rules applied, with reasons
- [ ] No image or personal data in logs
- [ ] Error codes as in §4
- [ ] Unit tests pass for mask + rules
- [ ] Average latency noted from the eval run (for the slides)
- [ ] Models used written down for the **AI/tool disclosure** (send names to Moncef)

---

## 14. Stretch (only if Moncef approves after 15:00 — otherwise skip)

`POST /api/ask` — body: `{ result: ReadResult, question: string }` → short Darija answer **based only on the extracted result**; if the answer isn't in the document, say so. No image re-upload.
