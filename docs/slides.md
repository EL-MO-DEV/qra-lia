# Slides — Qra Lia (7 slides, paste into Google Slides)

Share: **"Anyone with the link → Viewer"**. Put the live link on slides 1 and 7.
Screenshots: take them on a phone from https://qra-lia.vercel.app (use `?mock=ok` / `?mock=scam` for clean demo results — the DEMO banner shows, crop it out or say it's a demo).

---

## 1 — Title
**Qra Lia — اقرا ليا**
AI that reads your paperwork to you in Darija.
صوّر أي ورقة، نشرحوها ليك بالدارجة.
qra-lia.vercel.app · Team: Moncef · Sanaa Ouachhal · Youssef Rachi
GOMYCODE × NVIDIA "Come Build with AI" · Morocco

## 2 — The problem
- **1 in 4** Moroccans cannot read (24.8%, HCP 2024) — ~half of people 50+
- Official papers come in **French or Modern Standard Arabic**; people speak **Darija**
- → missed deadlines, penalties, scams that look official, dependence on others
- Quote (real user, with consent): *"…"*

## 3 — The solution (3 phone screenshots)
📸 Photograph → 🗣️ Darija explanation (amount, deadline, what to do, risk) → 📤 send to family / 🔊 listen / ⏰ reminder
One button. Big text. A voice that reads everything.

## 4 — How it works (diagram)
Photo → **Gemini 3.8 Flash** (vision → structured JSON) → **code rules** (deadline, legal words, scam signs) + **masking** (••••1234) → Darija result → **Gemini TTS** voice
Fallback: Groq (Qwen 3.8 27B) · No database · No storage

## 5 — Proof (numbers from `docs/test-results.md`)
- Documents read correctly: __/__ · Amount correct: __/__ · Deadline correct: __/__
- Blurry photos refused: __/__ · Non-documents refused: __/__ · Scams flagged: __/__
- Median latency: ~__ s (production: 2–6 s) · Fallback proven: ✅
- 15 automated tests

## 6 — Responsible AI
- **No storage** — photos processed in memory, never saved
- **Masking** of CIN / RIB / IBAN / card numbers, by the model and by code
- **Never invents** — unclear → "retake the photo", not a guess
- **Human check** — "verify with someone you trust"; low-confidence warning
- **Text-only sharing** — family gets the explanation, not the photo

## 7 — Impact & next steps
- Built for: elderly people, low-literacy users, families who help them
- Next: **WhatsApp bot** (photo in → Darija voice note out) · Android app · real Darija voice
- Partners: utilities (ONEE, Lydec), banks, CNSS, NGOs
**Try it: qra-lia.vercel.app**
