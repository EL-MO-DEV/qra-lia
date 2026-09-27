# Qra Lia — اقرا ليا

**Photograph any paper document and hear it explained in Moroccan Darija.**
صوّر أي ورقة، نشرحوها ليك بالدارجة، بالكتابة وبالصوت.

- **Live app:** https://qra-lia.vercel.app (works on any phone browser, no install, no account)
- **Demo video (90 s):** _link added at submission_
- **Slides:** _link added at submission_

Built in one day at the GOMYCODE × NVIDIA hackathon **"Come Build with AI"** (27 September 2026, Morocco).

---

## The problem

- **About 1 in 4 Moroccans cannot read** (24.8% illiteracy, HCP census 2024), and roughly half of people aged 50+.
- About 91% of Moroccans speak Darija, but official papers (electricity and water bills, bank letters, CNSS, administration and school letters) arrive in **French or Modern Standard Arabic**.
- The result: late payments and penalties, missed deadlines, scam letters that look official, and elderly people who depend on someone else to read their own mail.

> *"My mother photographs a bank letter. Her phone tells her in Darija: it's a reminder, you owe 340 DH before 15 October, fees may be added. She sends it to her son on WhatsApp to double-check."*

## What Qra Lia does

1. 📸 **Photograph the paper**, or pick a photo from the gallery.
2. 🤖 **AI reads it in seconds**, in French, Arabic or both.
3. 🗣️ **Explanation in Darija, in text and out loud:**
   - what the paper is and who sent it;
   - **how much** and **by when** (with "N days left");
   - **what to do now**;
   - a **risk level** (🟢 normal / 🟠 careful / 🔴 urgent), and a loud warning if it looks like a **scam** (card code, suspicious link, urgent transfer…).

Then the user can:

| | Feature |
|---|---|
| 🔊 | **Listen:** one natural voice (Gemini TTS "Sulafat"), the same on every phone. It can read the whole result, or the whole home page for people who can't read it. It falls back to the phone's voice if needed. |
| 📤 | **Send to family:** the explanation goes to WhatsApp or the share sheet as text only, never the photo. |
| ⏰ | **Reminder:** a calendar event on the deadline, with an alert 2 days before (`.ics`, works with Google Calendar and iPhone). |

🌐 **Darija / English switch** (top bar): the whole app, the AI explanation and the voice switch to English — handy for visitors and international reviewers. The choice is remembered on the phone.

Built for elderly and low-literacy users:
- one giant button per screen;
- text at least 20 px, buttons at least 56 px;
- every label has an icon, the Darija word and a small French subtitle;
- light and dark mode.

## How it works

```
Phone camera ─▶ compress in the browser (≤1600 px JPEG)
             ─▶ POST /api/read
                  ├─ Gemini 3.8 Flash (vision, structured JSON, 16 s budget,
                  │    retries on 503/429, one retry on invalid JSON)
                  ├─ fallback ─▶ Groq · Qwen 3.8 27B (vision)
                  ├─ zod validation (bad dates dropped, nothing guessed)
                  ├─ masking of CIN / RIB / IBAN / card numbers  (••••1234)
                  └─ deterministic risk rules (deadline, legal words, scam signs)
             ─▶ result card in Darija ─▶ 🔊 POST /api/tts (Gemini TTS) · 📤 share · ⏰ .ics
```

**Why AI + code rules:**
- **The model** reads the document, extracts the fields and writes the Darija explanation.
- **Plain code** then applies fixed rules, and the final risk is the **higher** of the two:
  - a deadline passed or within 3 days → high risk;
  - legal words (*tribunal, huissier, recouvrement, coupure…*) → high risk;
  - scam signs (*CVV, OTP, bit.ly, "ربحت"…*) → scam alert.
- **The app never says a paper is 100% safe.**

## Responsible AI & privacy

- **No storage:** no database, no accounts. Photos are processed in memory and never saved or logged.
- **Masking:** CIN, RIB/IBAN and card numbers are masked in every field (`••••1234`), twice: once by the prompt, once by code.
- **Never invents:** anything not clearly visible is `null` and isn't shown. Blurry photos and non-documents get a "retake the photo" message, not a guess.
- **Human in the loop:** every result says *"if this paper matters, check with someone you trust"*. When the AI is unsure (confidence < 0.6), a yellow warning appears at the top.
- **Share text only:** the family gets the explanation, not the photo with personal data.
- **Logs contain no document data:** only request id, status, provider, latency and error codes.

## Test results

_Final numbers are in [`docs/test-results.md`](docs/test-results.md) (produced by `scripts/eval.ts` on real documents)._

Measured in production logs so far:
- **Reading a document:** about **2–6 s** (Gemini 3.8 Flash).
- **Blurry photos and non-documents:** refused correctly ("هادي ما باناتش ورقة").
- **Voice:** about 6–14 s to generate, then cached.

Automated tests: `npm test` runs 15 unit tests (masking, risk rules, JSON parser).

## Tech stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4, deployed on **Vercel**
- **Google Gemini 3.8 Flash** for vision, extraction and the Darija explanation
- **Groq**, running **Qwen 3.8 27B** (vision), as the automatic fallback
- **Gemini 3.8 Flash TTS** for the voice ("Sulafat"), with the Web Speech API as fallback
- **zod** for validating the model output
- No database, no auth, no file storage

## Run it locally

Requirements: Node.js 20+ and npm, plus a free [Gemini API key](https://aistudio.google.com/apikey). A [Groq key](https://console.groq.com) is optional, for the fallback.

```bash
git clone https://github.com/EL-MO-DEV/qra-lia.git
cd qra-lia
npm install
cp .env.example .env.local      # put your own keys here — never commit them
npm run dev                     # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build |
| `npm test` | Unit tests (masking, risk rules, parser) |
| `npm run lint` | ESLint |

Useful URLs:
- `/?mock=ok` · `/?mock=scam` · `/?mock=unreadable`: demo results without calling the AI. A **DEMO** banner is shown.
- `POST /api/read` with `{ "imageBase64": "<base64, no data: prefix>", "mimeType": "image/jpeg" }` returns the result JSON (see `lib/types.ts`).
- `POST /api/tts` with `{ "text": "…" }` returns the Darija audio as WAV.

## Limitations & next steps

- **Voice:** the voice is prompted for a Moroccan accent, but a dedicated Darija voice would sound more local. Free-tier TTS quotas are small; the app waits and retries, then falls back to the phone's voice.
- **Internet:** the app needs a connection. Very blurry or handwritten papers are refused rather than guessed.
- **Next steps:**
  - a **WhatsApp bot** (send a photo, get a Darija voice note back);
  - an Android app;
  - partnerships with utilities, banks, CNSS and NGOs;
  - optional sharing of the photo with the family, with explicit consent.

## Team

- **Moncef** ([@EL-MO-DEV](https://github.com/EL-MO-DEV)): tech lead, features (voice, share, reminder), QA and delivery
- **Sanaa Ouachhal** ([@SanaaOua](https://github.com/SanaaOua)): backend and AI (prompt, masking, risk rules, providers; first built in Spring Boot, ported to the Next.js API)
- **Youssef Rachi** ([@rachiyoussef](https://github.com/rachiyoussef)): frontend (screens, upload, compression)

## AI & tool disclosure

- **Google Gemini 3.8 Flash** reads document photos, extracts structured fields and writes the Darija explanation.
- **Groq (Qwen 3.8 27B)** is the automatic fallback.
- **Deterministic code rules** (deadlines, legal keywords, scam signs, number masking) complement the model's risk assessment.
- **The voice** is **Gemini 3.8 Flash TTS** (voice "Sulafat"), with the browser Web Speech API as fallback.
- **Claude Code** (Anthropic) was used as a coding assistant. The team did the product decisions, architecture, prompts and testing.
- No images or personal data are stored.
- NVIDIA Brev was not used: the credit request deadline had passed.
