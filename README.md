# اقرا ليا — Backend API (Spring Boot)

Monolithic Spring Boot API for **Qra Lia** (اقرا ليا): a photo of a Moroccan paper document becomes **structured JSON**, a **risk level with reasons**, and **concrete next actions** in Darija.

The model never decides alone that something is “dangerous” or “100% safe”. Extraction proposes fields; **deterministic Java rules** raise the risk when a deadline is close, legal language appears, or scam signs show up. A person decides at the end.

## What it does

1. **Read (extraction)** — document type, sender, amount, deadline, requested action.
2. **Risk** — `low` / `medium` / `high` plus reasons.
   - Low: ordinary bill, deadline still far
   - Medium: due in ≤ 7 days, or late-fee language
   - High: court / debt collection / utility cut-off / scam
   - Code overlay: deadline in ≤ 3 days is always at least **high** (`بقاو غير أيام قلال`)
3. **Actions** — Darija explanation (for voice), what to do now, reminder, share with family, scam warning. Low confidence (`< 0.6`) adds `تأكد مع شي حد`.

Pipeline (CDC):

```
validate → Gemini (15s, JSON retry once) → Groq fallback → mask CIN/RIB/IBAN/card → risk rules → days_left → actions
```

If both API keys are empty, the server uses a **mock** so the frontend is never blocked.

## Stack

- Java 21, Spring Boot 3.4 (single module, no extra services, no database, no auth)
- Gemini (`com.google.genai`) primary, Groq OpenAI-compatible vision fallback
- Jackson validation of model JSON, in-memory rate limit (10 req/min/IP)

## Run locally

```bash
# Java 21 + Maven
cp .env.example .env.local   # optional: put GEMINI_API_KEY / GROQ_API_KEY here and export them

export SERVER_PORT=18080
mvn spring-boot:run
```

Without keys, mock mode starts automatically.

- API: `http://127.0.0.1:18080/api/read`
- Small tester UI: `http://127.0.0.1:18080/`
- Swagger: `http://127.0.0.1:18080/swagger-ui.html`
- Health: `http://127.0.0.1:18080/actuator/health`

### `POST /api/read`

```json
{ "imageBase64": "<base64 without data: prefix>", "mimeType": "image/jpeg" }
```

Accepted mime types: `image/jpeg`, `image/png`, `image/webp`. Max decoded size ~3 MB.

Header `X-Mock-Scenario`: `low` | `medium` | `high` | `scam` | `unreadable` | `not_a_document` (forces mock even if keys exist).

Response (HTTP 200) matches the frontend contract, plus additive `recommended_actions`:

```json
{
  "status": "ok",
  "doc_type": "facture électricité",
  "sender": "ONEE",
  "amount": { "value": 247.8, "currency": "MAD" },
  "deadline": "2026-10-15",
  "days_left": 18,
  "action": "خلّص الفاتورة قبل تاريخ الأجل",
  "risk_level": "low",
  "risk_reasons": ["فاتورة عادية", "الأجل باقي بعيد"],
  "scam_suspected": false,
  "confidence": 0.86,
  "darija_summary": "…",
  "provider": "gemini",
  "latency_ms": 12,
  "recommended_actions": []
}
```

`unreadable` / `not_a_document` still return **200** with a Darija message. Fields that are not clearly visible stay `null` (never guessed). `days_left`, `provider`, and `latency_ms` are computed on the server.

### Errors

| HTTP | Body |
|---|---|
| 400 | `{ "error": "invalid_input" }` |
| 413 | `{ "error": "image_too_large" }` |
| 429 | `{ "error": "rate_limited" }` |
| 502 | `{ "error": "ai_unavailable", "darija_message": "ما قدرناش نقراو الورقة دابا، عاود من بعد شوية." }` |
| 500 | `{ "error": "internal" }` |

### `POST /api/ask` (stretch)

Body: `{ "result": { …ReadResult }, "question": "شحال خاصني نخلّص؟" }`  
Answer uses only the extracted result, in Darija.

### curl

```bash
B64=$(base64 -w0 test.jpg)
curl -s -X POST http://127.0.0.1:18080/api/read \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"$B64\",\"mimeType\":\"image/jpeg\"}"
```

Fallback check: set a bogus `GEMINI_API_KEY` and a valid `GROQ_API_KEY` → `provider` must be `groq`.

## Environment

See `.env.example`. Keys stay in env vars, never in logs or responses. Logs only: `requestId`, `status`, `provider`, `latency_ms`, error type.

CORS is limited to `CORS_ORIGINS` (default local Next.js). Empty list = same-origin only.

## Tests

```bash
mvn test
```

Unit tests cover masking (CIN, RIB, IBAN, card, ordinary sentence) and every CDC risk rule.

## Models (AI disclosure)

- Primary: `GEMINI_MODEL` (default `gemini-2.5-flash`, vision)
- Fallback: `GROQ_MODEL` (default `meta-llama/llama-4-scout-17b-16e-instruct`, vision)
