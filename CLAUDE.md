# CLAUDE.md — Qra Lia (اقرا ليا) · Moncef's complete file

# PART A — Tech Lead, rules & plan

> Brief for Claude Code working with **Moncef (Tech Lead / Integrator)**. Read the whole file before writing code.
> Talk to Moncef in Darija (Latin script) or English. Code, comments and commits in English.
> **Team of 3.** Moncef = Tech Lead + Features/PWA (role 4) + QA/Delivery (role 5). Two teammates: Backend/AI (role 2) and Frontend Core (role 3), each with their own CDC file (`CDC-backend-ai.md`, `CDC-frontend-core.md`) and their own AI assistant.
>
> This file has three parts: **Part A** (lead, rules, plan), **Part B** (Features + PWA spec), **Part C** (QA + Delivery spec). Everything Moncef builds is in here.

---

## 0. TL;DR

**Qra Lia**: mobile-first web app (installable PWA). The user photographs a paper document (electricity/water bill, bank letter, CNSS, school or administration letter) and the app explains it in **Moroccan Darija, in text and out loud**: what it is, who sent it, how much, the deadline, what to do, and whether it looks risky or like a scam.

Built in ONE day by a team of 3 at the GOMYCODE × NVIDIA hackathon "Come Build with AI" (Sunday 27 Sept 2026, online). Goal: **1st place in Morocco** + Yassir "AI for Everyday Impact" award.

**Golden rule: a small thing that works 100% beats a big thing that half works.**

---

## 1. Hackathon rules that affect the work

- **Everything is built on event day.** The jury judges what is built during the hackathon. No code from other projects. Commit often (timestamps are evidence).
- **Team:** name `Qra Lia` in every form, same lead email as the Final Team Confirmation (update it via "Modifier votre réponse" — never submit a duplicate). Team size is now **3** — update the Final Team Confirmation ("Modifier votre réponse"): size 3, remove the two members who left. Each member must be registered, in Morocco, and in no other team.
- **NVIDIA Brev: not used** (credit request deadline passed). Brev is optional; judging is tool-neutral.
- **AI/tool disclosure is mandatory**: every model, API, agent, dataset, generated asset (incl. Claude/Claude Code, any Higgsfield clip).
- **Secrets:** production keys only in Vercel env vars, set by Moncef. Never in code, repo, video, slides, forms or the group chat.
- **Submission deadline: 17:30** (Tunis = Morocco time, UTC+1). Target: **17:15**.

### Event day schedule
| Time | What |
|---|---|
| 08:30 | Check-in on Zoom + WhatsApp groups (Online + Morocco) |
| 09:00–10:00 | Opening, sessions, roster check |
| 10:15–11:15 | NVIDIA workshop (one person listens and summarises; Moncef does setup) |
| 11:15–13:00 | Build sprints 1–2 (mentor checkpoint 11:30) |
| 13:00–13:45 | Lunch |
| 13:45–14:00 | Submission briefing (QA listens and takes notes) |
| 14:00–17:00 | Build sprints 3–4 (technical checkpoint 15:30) |
| 17:00–17:30 | Submit |
| 17:45–19:15 | Jury judges from submitted materials only |
| 19:15–19:45 | Top 3 per country: live demo |
| 19:45–20:00 | Awards |

**The jury picks winners from the submission (video + links + project card).** The 90-second video and the working link ARE the pitch.

---

## 2. Judging rubric (100 pts) → how we score

| Criterion | Pts | How |
|---|---|---|
| Problem + user value | 20 | Real Moroccan problem (literacy + French/Arabic admin papers), real user in the video |
| Functional execution | 20 | Live link, end-to-end on a phone |
| Quality of AI use | 20 | Vision → structured JSON → Darija explanation + code risk rules; explain model choices |
| Testing + reliability | 15 | 15+ real docs, results table, blurry/non-doc handling, Groq fallback, latency + cost |
| Experience + demo | 15 | One big button, huge text, voice, 90s video with FR/EN subtitles |
| Responsible AI + data | 10 | No storage, masking, "check with someone", share-to-family, never invents |

---

## 3. Problem & pitch facts
- Morocco illiteracy: **24.8% (2024 census, HCP)**, about **51% among people aged 50+**; about **91%** speak Darija. Verify the source links before the slides.
- Official papers come in French or Modern Standard Arabic → late payments, penalties, fake letters, dependence on others.
- User story: *"My mother photographs a bank letter. Her phone tells her in Darija: it's a reminder, you owe 340 DH before 15 October, fees may be added. She sends it to her son on WhatsApp to double-check."*

---

## 4. Team & ownership — ⛔ READ BEFORE EDITING ANY FILE

| # | Role | Owner | Owns | CDC |
|---|---|---|---|---|
| 1 | Tech Lead / Integrator | **Moncef** | `lib/types.ts`, `lib/mock.ts`, `app/layout.tsx`, config files, `.env.example`, `.gitignore`, `.github/`, `.claude/`, `CLAUDE.md`, `CDC-*.md`, Vercel | this file |
| 2 | Backend / AI | teammate | `app/api/read/**`, `lib/gemini.ts`, `lib/groq.ts`, `lib/prompt.ts`, `lib/schema.ts`, `lib/mask.ts`, `lib/rules.ts`, `lib/*.test.ts` for those | `CDC-backend-ai.md` |
| 3 | Frontend Core UI | teammate | `app/page.tsx`, `app/globals.css`, `components/UploadPanel.tsx`, `components/Loading.tsx`, `components/ResultCard.tsx`, `components/ErrorState.tsx`, `components/SafetyNote.tsx`, `lib/compress.ts`, `lib/api.ts` | `CDC-frontend-core.md` |
| 4 | Features + PWA | **Moncef** | `components/ListenButton.tsx`, `components/ShareButton.tsx`, `components/ReminderButton.tsx`, `components/InstallPrompt.tsx`, `components/RegisterSW.tsx`, `lib/tts.ts`, `lib/share.ts`, `lib/ics.ts`, `app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icon-*.png`, `public/apple-touch-icon.png`, `app/dev-features/**` | Part B below |
| 5 | QA + Delivery | **Moncef** | `scripts/eval.ts`, `README.md`, `docs/**`, `test-docs/` (gitignored) | Part C below |

### ⛔ Hard rule for Claude Code
**You may create or edit ONLY files owned by Moncef (roles 1, 4, 5).**
- **Never** create, edit, move, delete or reformat files owned by role 2 or role 3 — not with the edit tools, not with `sed`/`echo`/scripts in Bash, not with "quick fixes", not with lint `--fix` or formatters run on the whole repo.
- If a bug is in their file: stop, explain the bug and the exact fix in the chat, and let Moncef send it to the owner.
- If a new file is needed and its owner is unclear: ask Moncef first.
- Resolving a merge conflict in their files: prefer **their** version, and tell Moncef.
- Run formatters/linters only on Moncef's files (`npx prettier --write <file>`), never on `.`.
- Merging their Pull Requests is allowed (that's integration), changing their code is not.
- These paths are also blocked in `.claude/settings.local.json` (see §4b). If a tool call is denied, do not look for a workaround.

### 4b. Enforcement files (Moncef creates them at setup)

`.claude/settings.local.json` — local only (not committed), so it only restricts Moncef's Claude Code. Check the Claude Code docs if the permission syntax has changed.
```json
{
  "permissions": {
    "deny": [
      "Edit(app/api/read/**)",
      "Edit(lib/gemini.ts)", "Edit(lib/groq.ts)", "Edit(lib/prompt.ts)",
      "Edit(lib/schema.ts)", "Edit(lib/mask.ts)", "Edit(lib/rules.ts)",
      "Edit(app/page.tsx)", "Edit(app/globals.css)",
      "Edit(components/UploadPanel.tsx)", "Edit(components/Loading.tsx)",
      "Edit(components/ResultCard.tsx)", "Edit(components/ErrorState.tsx)",
      "Edit(components/SafetyNote.tsx)",
      "Edit(lib/compress.ts)", "Edit(lib/api.ts)"
    ]
  }
}
```
Exception: at 10:30 Moncef creates the **placeholder** `app/api/read/route.ts` (returns `MOCK_OK`) **before** adding this file. After that, the route belongs to role 2.

`.github/CODEOWNERS` (committed) — replace usernames:
```
*                      @MONCEF_GITHUB
/app/api/              @BACKEND_GITHUB
/lib/gemini.ts         @BACKEND_GITHUB
/lib/groq.ts           @BACKEND_GITHUB
/lib/prompt.ts         @BACKEND_GITHUB
/lib/schema.ts         @BACKEND_GITHUB
/lib/mask.ts           @BACKEND_GITHUB
/lib/rules.ts          @BACKEND_GITHUB
/app/page.tsx          @FRONTEND_GITHUB
/app/globals.css       @FRONTEND_GITHUB
/components/UploadPanel.tsx  @FRONTEND_GITHUB
/components/Loading.tsx      @FRONTEND_GITHUB
/components/ResultCard.tsx   @FRONTEND_GITHUB
/components/ErrorState.tsx   @FRONTEND_GITHUB
/components/SafetyNote.tsx   @FRONTEND_GITHUB
/lib/compress.ts       @FRONTEND_GITHUB
/lib/api.ts            @FRONTEND_GITHUB
```

Branches: `backend` (role 2), `ui-core` (role 3), `features` + `qa` (Moncef). PRs to `main`. **Only Moncef merges.**

## 5. Moncef's day (lead + features + QA/delivery)

Moncef carries three roles, so time is the enemy. Follow this order and respect the cut list.

| Time | Task | Done when |
|---|---|---|
| 10:15–10:45 | **Setup:** Next.js app, `lib/types.ts`, `lib/mock.ts`, placeholder `/api/read` (returns `MOCK_OK` after 1.5 s), `.gitignore` (`.env*.local`, `test-docs/`), `.env.example`, all `CDC-*.md` + this file in root, GitHub repo (public) + 2 collaborators + branches + CODEOWNERS, Vercel deploy, then `.claude/settings.local.json` | Live URL + repo link posted in the group |
| 10:45–11:15 | **Stub feature components** with the exact props from Part B §B3 → push on `features`, merge | Role 3 can import them |
| 11:15–12:15 | 🔊 `ListenButton` + `lib/tts.ts`, then 📤 `ShareButton` + `lib/share.ts` (test on `app/dev-features`) | Both work on a phone |
| 12:15–13:00 | `scripts/eval.ts` + `test-docs/expected.json` (runs against the placeholder) | Table prints |
| **13:00** | **Integration 1:** merge `backend` + `ui-core` + `features`, deploy, real photo on a phone | End-to-end works |
| 13:45–14:00 | Submission briefing — note everything in `docs/submission.md` | |
| 14:00–14:30 | ⏰ `ReminderButton` + `lib/ics.ts` | .ics imports with 2-day alert |
| 14:30–15:00 | PWA: `manifest.ts`, icons, apple-touch-icon, `InstallPrompt`; `sw.js` + `offline.html` only if time | Installable on Android |
| **15:00** | **Feature freeze.** Run eval on the real API → send results to role 2 for prompt tuning | Results table v1 |
| 15:00–16:15 | Device test grid, README, `docs/submission.md` (summary ≤150 words, awards, disclosure), slides | All texts ready |
| **16:15** | **Code freeze**, tag `v1.0`, final eval run → final numbers | Results table final |
| 16:15–17:00 | Video (90 s, FR + EN subtitles), links tested in incognito | Video uploaded |
| **17:00–17:15** | **Submit**, screenshot the confirmation | ✅ |

### Cut list if late (cut from the top, never cut the bottom)
1. `sw.js` + `offline.html` + `InstallPrompt` (keep only manifest + icons)
2. ⏰ Reminder
3. Automated `eval.ts` → replace with a manual Google Sheet of results
4. Slides beyond 5 slides
- **Never cut:** 🔊 Listen, 📤 Share, a working deployed MVP, the test numbers, the video, the submission.

### Recommended delegation after the 15:00 freeze
- Role 2 (backend): prompt tuning with the eval results + send the exact model names for the disclosure.
- Role 3 (frontend): device tests on their phones + screenshots for the slides + help recording the demo.
Ask them — they own the decision on their time.

### Safety net for the backend
Only if role 2's endpoint is not working at 13:00: temporarily remove the `app/api/read/**` deny rule, write a minimal Gemini call on branch `lead-safety`, merge it so the team isn't blocked, restore the deny rule, and let role 2 replace it when theirs passes. Tell role 2 openly.

## 6. Shared contract (paste as-is)

### `lib/types.ts`
```ts
export type ReadStatus = "ok" | "unreadable" | "not_a_document";
export type RiskLevel = "low" | "medium" | "high";

export type ReadResult = {
  status: ReadStatus;
  doc_type: string | null;
  sender: string | null;
  amount: { value: number; currency: string } | null;
  deadline: string | null;      // ISO "YYYY-MM-DD"
  days_left: number | null;     // computed by the server
  action: string | null;
  risk_level: RiskLevel;
  risk_reasons: string[];
  scam_suspected: boolean;
  confidence: number;           // 0..1
  darija_summary: string;       // Darija, Arabic script
  provider: "gemini" | "groq";
  latency_ms: number;
};

export type ApiErrorCode =
  | "invalid_input" | "image_too_large" | "rate_limited" | "ai_unavailable" | "internal";

export type ApiError = { error: ApiErrorCode; darija_message?: string };

export type ReadRequest = { imageBase64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" };
```

### `lib/mock.ts`
```ts
import type { ReadResult } from "./types";

export const MOCK_OK: ReadResult = {
  status: "ok",
  doc_type: "فاتورة الضو والما",
  sender: "ONEE",
  amount: { value: 340, currency: "MAD" },
  deadline: "2026-10-15",
  days_left: 18,
  action: "خلّص قبل 15 أكتوبر فالوكالة ولا فالتطبيق",
  risk_level: "medium",
  risk_reasons: ["إلا ما خلّصتيش يقدرو يزيدو غرامة"],
  scam_suspected: false,
  confidence: 0.92,
  darija_summary: "هادي فاتورة ديال الضو والما من ONEE. خاصك تخلّص 340 درهم قبل 15 أكتوبر. تقدر تخلّص فالوكالة ولا فالتطبيق. إلا تعطلتي يقدرو يزيدو غرامة.",
  provider: "gemini",
  latency_ms: 3800,
};

export const MOCK_UNREADABLE: ReadResult = {
  ...MOCK_OK, status: "unreadable", doc_type: null, sender: null, amount: null,
  deadline: null, days_left: null, action: null, risk_level: "low", risk_reasons: [],
  confidence: 0, darija_summary: "الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون.",
};

export const MOCK_SCAM: ReadResult = {
  ...MOCK_OK, doc_type: "رسالة ديال ربح", sender: null, amount: { value: 10000, currency: "MAD" },
  deadline: null, days_left: null, action: "ما تصيفط حتى معلومة وما تكليكيش على الرابط",
  risk_level: "high", scam_suspected: true,
  risk_reasons: ["كيطلبو الكود ديال الكارط", "رابط مشكوك فيه"],
  darija_summary: "رد البال! هاد الرسالة فيها علامات ديال النصب. كيطلبو منك الكود ديال الكارط. ما تصيفط والو وسول شي حد تيق فيه.",
};
```
**Contract changes only through Moncef**, announced in the group.

---

## 7. Stack & environment
- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
- Gemini (primary, vision) via Google Gen AI SDK — check current package name/docs. Groq (fallback, vision-capable model on the account).
- No database, no storage. Voice = browser Web Speech API.

`.env.example`
```
GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
GROQ_MODEL=
```
Teammates use their own free keys locally. Production keys: Moncef, in Vercel only.

### Architecture
```
Phone camera → page.tsx (compress) → lib/api.ts → POST /api/read
   → Gemini (15 s timeout) ─fail→ Groq ─fail→ 502 ai_unavailable
   → zod → mask → rules (days_left, risk) → ReadResult
→ ResultCard → Listen 🔊 / Share 📤 / Reminder ⏰
```
Monolith, modular folders — the API can later serve a WhatsApp bot or Android app unchanged.

---

## 8. Scope
**MVP (by 15:00):** photo → result card (type, sender, amount, deadline, action, risk) → Darija text + 🔊 → safety note → masking → unreadable/not-a-document handling → Groq fallback → deployed.
**Extras (in order):** 📤 share to family → ⏰ reminder → PWA install → scam warning UI → (stretch, only if everything else is done) ask-a-question `/api/ask`.
**Never today:** login, database, history, dashboard, payments, native app.

---

## 9. Integration checklist (Moncef runs it at 13:00, 15:00, 16:15)
- [ ] `npm run build` passes on `main`
- [ ] Real photo on a real phone → correct result card
- [ ] Blurry photo → "عاود صوّر" message, no invented data
- [ ] Broken Gemini key (preview env) → Groq answers
- [ ] 🔊 speaks, 📤 opens share sheet/WhatsApp, ⏰ downloads .ics (when deadline exists)
- [ ] No keys or personal data in the repo, logs, or UI
- [ ] Vercel production URL works in incognito

---

## 10. Submission checklist (with QA)
- [ ] Team name `Qra Lia`, same lead email, Morocco, ONLINE
- [ ] Title + summary ≤150 words (problem, solution, features, tech, next step)
- [ ] Prototype URL · Source code URL (public, README, no secrets, no test-docs) · Presentation URL · 90s video (unlisted, tested logged-out)
- [ ] Primary prize: **Yassir — AI for Everyday Impact**; extra: **EY Studio+ Human-Centred Innovation** (+ others only if they genuinely fit), 2–3 sentences of evidence each
- [ ] AI/tool disclosure with real model names
- [ ] Brev: "Not used — the credit request deadline had passed."

### AI/tool disclosure — draft
> Qra Lia uses Google Gemini (<model>) to read document photos, extract structured fields and write the Darija explanation. Groq (<model>) is the automatic fallback. Deterministic code rules (deadlines, legal keywords, scam signs) complement the model's risk assessment. Text-to-speech uses the browser Web Speech API. The team used Claude Code (Anthropic) as a coding assistant; architecture, prompts and testing were done by the team. <If used: the video intro was generated with Higgsfield.> No images or personal data are stored. NVIDIA Brev was not used.

---

## 11. Video (90 s, FR + EN subtitles mandatory)
| Time | Content |
|---|---|
| 0–15 s | Problem + stat "1 in 4 Moroccans can't read" (optional disclosed Higgsfield clip) |
| 15–60 s | Real phone recording: photo → result → 🔊 Darija → 📤 send to son |
| 60–75 s | Proof: results table, blurry photo refused, fallback |
| 75–90 s | Responsible AI + next step: WhatsApp bot (photo in, Darija voice note out), Android app, partners |
A real person using it (with consent) beats any animation. Never present AI-generated people as real users.

---

## 12. How Claude Code works with Moncef
- Small steps; after each, say exactly what to test on the phone.
- Keep `main` deployable at all times; deploy after every merge.
- **Never touch files owned by role 2 or role 3 (§4). Explain the fix instead.**
- Before adding anything outside §8, ask first. If a choice costs >20 min, propose the simpler option.
- Remind Moncef at 13:00 (integration), 15:00 (freeze), 16:15 (code freeze + video), 17:00 (submit).

---

# PART B — Features + PWA (role 4, owned by Moncef)

## B1. Context in 30 seconds

Qra Lia is a mobile-first web app. The user photographs a paper document (bill, bank letter, CNSS, administration letter) and the app explains it in **Moroccan Darija**, in text and out loud. Users are **elderly and low-literacy people**.

After the explanation, your features turn information into **action**:
🔊 **Listen** to the explanation · 📤 **Send to family** to double-check · ⏰ **Reminder** before the deadline · 📲 **Install** the app on the home screen.

These features directly earn points: "human oversight" (Responsible AI), "practical value" and "everyday impact" (Yassir award).

---

## B2. Scope

**You own (Moncef owns these):**
```
components/ListenButton.tsx
components/ShareButton.tsx
components/ReminderButton.tsx
components/InstallPrompt.tsx
lib/tts.ts
lib/share.ts
lib/ics.ts
app/manifest.ts
public/sw.js
public/offline.html
public/icon-192.png  public/icon-512.png  public/apple-touch-icon.png
components/RegisterSW.tsx          # tiny client component, Moncef adds it to layout
```
**Read-only for you:** `lib/types.ts`, `lib/mock.ts`. Role 3 places your buttons inside the result card.
**Out of scope:** the API, the main screens.

Build and test everything on a small dev page `app/dev-features/page.tsx` using `MOCK_OK` / `MOCK_SCAM` (delete it before the 16:15 freeze, or leave it out of navigation).

---

## B3. Component interfaces (fixed — role 3 codes against these)

```tsx
<ListenButton text={string} />                 // speaks Darija text
<ShareButton result={ReadResult} />            // share sheet / WhatsApp
<ReminderButton result={ReadResult} />         // renders null if no deadline
<InstallPrompt />                              // shows only when installable / on iOS
```
All buttons: height ≥ 56px, icon + Darija label + small French subtitle, full width on mobile, visible focus state, work with the site's CSS variables (light + dark). Push stub versions with these exact props **by 11:45** so role 3 can import them.

---

## B4. 🔊 ListenButton + `lib/tts.ts`

- Web Speech API: `speechSynthesis`, `SpeechSynthesisUtterance`.
- Voice choice: prefer `ar-MA`, else any `ar-*` voice. Voices load async → listen to `voiceschanged` and also try `getVoices()` immediately.
- `rate ≈ 0.9`, `lang` set to the chosen voice's lang.
- States: idle → speaking → idle. While speaking, the button becomes ⏹️ **وقّف** (stop = `speechSynthesis.cancel()`).
- Split long text into sentences (on `.`, `،`, `!`, `؟`) and queue them — some browsers cut long utterances.
- Cancel speech when the component unmounts or a new document is read.
- **No Arabic voice available** → hide the button and show a small note: "الصوت ما متوفرش فهاد التيليفون" (*Voix non disponible sur cet appareil*).
- Label: 🔊 **سمع الشرح** (*Écouter*).
- Note for the pitch/README: the browser voice reads Darija with a Standard Arabic accent — a better Darija voice is a "next step".

---

## B5. 📤 ShareButton + `lib/share.ts`

Label: 📤 **صيفط لشي حد من العائلة** (*Envoyer à un proche*).

Share text (skip lines whose value is null):
```
📄 {doc_type} — {sender}
💰 {amount.value} درهم
📅 قبل {deadline formatted}
✅ {action}
⚠️ {first risk reason, only if risk_level is "high" or scam_suspected}

{darija_summary}

— Qra Lia · تأكد ديما من الورقة الأصلية
```
- If `navigator.share` exists → `navigator.share({ title: "Qra Lia", text })`. Ignore the user-cancel error silently.
- Else → open `https://wa.me/?text=` + `encodeURIComponent(text)` in a new tab.
- **Never share the image** (privacy). Text only, sensitive numbers are already masked by the API.

---

## B6. ⏰ ReminderButton + `lib/ics.ts`

Render **only if `result.deadline` exists and `days_left >= 0`.**
Label: ⏰ **فكّرني قبل الأجل** (*Me rappeler*).

`lib/ics.ts`:
```ts
export function buildIcs(result: ReadResult): string
```
- All-day event on the deadline: `DTSTART;VALUE=DATE:YYYYMMDD`, `DTEND` = next day.
- `SUMMARY`: `Qra Lia — {doc_type} ({amount} DH)`; `DESCRIPTION`: `action` + `darija_summary` (escape commas, semicolons, newlines per RFC 5545).
- `VALARM` with `TRIGGER:-P2D` (2 days before) and `ACTION:DISPLAY`.
- `UID` = random + `@qra-lia`, `DTSTAMP` = now in UTC, `PRODID:-//Qra Lia//EN`, CRLF line endings.
- Download as `qra-lia-rappel.ics` via Blob + temporary `<a download>`. On iPhone, Safari offers "Add to Calendar".
- After tapping: small confirmation "✅ تزاد التذكير فالكاليندري ديالك" (only a hint — we can't detect success).

---

## B7. 📲 PWA

### `app/manifest.ts`
```ts
name: "Qra Lia — اقرا ليا", short_name: "Qra Lia",
description: "صوّر أي ورقة ونشرحها ليك بالدارجة",
start_url: "/", display: "standalone", dir: "rtl", lang: "ar",
background_color / theme_color: match the site's tokens,
icons: 192 + 512 (purpose "any"), plus a 512 "maskable" version
```
Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (180×180) — ask Moncef to add it in `layout.tsx`.

### Icons
Simple, readable at small size: e.g. a document + speech bubble. Make them in Canva/Figma or as an SVG exported to PNG. Maskable version with the symbol inside the central safe zone.

### `public/sw.js` (keep it tiny)
- `install`: cache `/offline.html`, `skipWaiting()`.
- `activate`: `clients.claim()`, delete old caches.
- `fetch`: **only for navigation requests**, network first, fallback to `/offline.html`. Never cache `/api/*`.

### `public/offline.html`
Self-contained (inline CSS), Darija + French: "ما كاينش الأنترنت. Qra Lia محتاجة الأنترنت باش تقرا الورقة." + retry button (`location.reload()`).

### `components/RegisterSW.tsx`
Client component, `useEffect` → `navigator.serviceWorker?.register("/sw.js")`. Only in production builds.

### `components/InstallPrompt.tsx`
- Android/Chrome: capture `beforeinstallprompt`, `preventDefault()`, show 📲 **زيد Qra Lia للتيليفون** (*Installer l'application*) → `prompt()`.
- iOS Safari (no event): if not already standalone, show a dismissible hint: "دوز على ⬆️ Partager ← Sur l'écran d'accueil".
- Hide when already installed (`matchMedia("(display-mode: standalone)")`).
- Place it on the home screen (Moncef/role 3 decide the spot).

### Check
Chrome DevTools → Application → Manifest: no errors, installable. Test install on a real Android and "Add to Home Screen" on an iPhone.

---


## B9. Timeline
Follow the combined timeline in **Part A §5** (it replaces the separate role timelines).

---

## B10. Definition of done ✅
- [ ] 🔊 speaks Darija text on Android + iPhone, stop works, graceful when no Arabic voice
- [ ] 📤 opens the share sheet, WhatsApp fallback works on desktop, text never contains null
- [ ] ⏰ downloads a valid .ics that imports into Google Calendar and iPhone Calendar with a 2-day alert
- [ ] Hidden when no deadline or deadline passed
- [ ] Manifest valid, icons (incl. maskable + apple-touch), installable on Android, iOS hint shown
- [ ] Offline page shows when there's no connection; `/api/*` never cached
- [ ] All buttons ≥ 56px, icon + Darija + French, light + dark


---

# PART C — QA + Delivery (role 5, owned by Moncef)

## C1. Why this role decides if we win

The jury picks winners **from the submission only** (video + links + project card). Only the top 3 in Morocco do a live demo. So you own two things that carry a lot of points:
- **Testing + reliability (15 pts):** real numbers that prove the app works.
- **The submission package:** texts, disclosure, links, video coordination.

Context: Qra Lia lets someone photograph a paper document (bill, bank letter, CNSS, administration letter) and explains it in **Moroccan Darija**, text + voice: what it is, who sent it, how much, the deadline, what to do, and if it's risky or a scam. For elderly and low-literacy users.

---

## C2. Scope

**You own:**
```
scripts/eval.ts            # automated test run
test-docs/                 # PRIVATE — in .gitignore, never pushed, never shared publicly
test-docs/expected.json
README.md
docs/submission.md         # all texts for the submission form
docs/video-script.md
docs/test-results.md       # the results table for slides + submission
```
**Out of scope:** app code (report bugs in the group with steps + screenshot, the owner fixes them).

---

## C3. Test set — collect it first (before 12:15 at the latest)

Photos with a phone, flat, good light. **Before photographing, cover** names, CIN, RIB/IBAN, card and account numbers, addresses, phone numbers (paper strip or finger).

| Group | Count | Examples |
|---|---|---|
| Real documents | 15+ | electricity/water bills, bank letters, CNSS, telecom bills, school letters, administration letters — mix French, Arabic, bilingual |
| Hard photos | 3 | blurry, dark, document cut off |
| Not a document | 2 | a wall, a cup |
| Scam | 2–3 | fake prize SMS screenshot, fake "your parcel is blocked" message, fake bank message asking for a code |

Name files `01-onee.jpg`, `02-banque.jpg`… and fill `test-docs/expected.json` by reading each document yourself:
```json
[
  { "file": "01-onee.jpg", "status": "ok", "amount": 340, "deadline": "2026-10-15", "scam": false },
  { "file": "16-flou.jpg", "status": "unreadable" },
  { "file": "18-mur.jpg",  "status": "not_a_document" },
  { "file": "20-sms-gain.jpg", "status": "ok", "scam": true }
]
```
Use `null` when a document has no amount or no deadline.

Share `test-docs/` with the team **privately** (Drive link restricted to the team), never in the public repo or public chat.

---

## C4. `scripts/eval.ts`

Run with: `npx tsx scripts/eval.ts` (env `EVAL_URL`, default `http://localhost:3000/api/read`).

For each entry in `expected.json`:
1. Read the image, base64 (no `data:` prefix), POST `{ imageBase64, mimeType: "image/jpeg" }`.
2. Measure wall-clock latency.
3. Compare:
   - `status` equal
   - `amount` OK if `|got - expected| ≤ 1` (or both null)
   - `deadline` OK if equal (or both null)
   - `scam` OK if `scam_suspected === expected.scam` (only when `scam` is set)
4. Run requests **one at a time** with a 2 s pause (free-tier rate limits).

Output:
- A markdown table to the console **and** to `docs/test-results.md`:
  `| file | status | amount | deadline | scam | provider | latency |` with ✅/❌.
- A summary block, e.g.:
  ```
  Documents read correctly: 14/15
  Amount correct: 14/15 · Deadline correct: 13/15
  Bad photos correctly refused: 3/3 · Non-documents refused: 2/2
  Scams flagged: 3/3 · False scam alarms: 0/15
  Median latency: 4.1 s · Fallback used: 1 time
  ```
- **Never print the extracted text or darija_summary** (personal data).

Also run once with a broken Gemini key (Moncef sets it on a preview deployment) to prove the Groq fallback. Note it in the results.

---

## C5. Manual device tests (after 15:00)

| Test | Android | iPhone | Desktop |
|---|---|---|---|
| Open live link | | | |
| Camera photo → result | | | |
| Gallery photo → result | | | |
| 🔊 Listen / stop | | | |
| 📤 Share → WhatsApp | | | |
| ⏰ Reminder imports to calendar | | | |
| Install on home screen | | | |
| Airplane mode → offline page | | | |
| Dark mode readable | | | |

Report bugs to the owner: **what you did → what you expected → what happened + screenshot**. Never fix their files yourself.

---

## C6. README.md (public repo)

Sections: one-line pitch · problem (with the literacy stats + source) · demo link + video link · how it works (photo → Gemini → rules → Darija + voice) · features · tech stack · responsible AI (no storage, masking, human check, never invents) · test results (paste the summary) · limitations (browser voice has a Standard Arabic accent, needs internet, free-tier limits) · next steps · team · AI/tool disclosure · local setup (`.env.example`, `npm run dev`).

---

## C7. `docs/submission.md` — prepare everything before 16:15

1. **Team name:** `Qra Lia` · lead email: the one in the Final Team Confirmation · Morocco · ONLINE
2. **Project title:** "Qra Lia — اقرا ليا: AI that reads your paperwork to you in Darija"
3. **Summary (≤150 words, count them):** problem → solution → key features → technologies → next step
4. **Links:** prototype (Vercel) · source code (GitHub) · presentation (Google Slides, "anyone with the link can view") · video (unlisted)
5. **Primary prize:** Yassir — AI for Everyday Impact. **Extra:** EY Studio+ Human-Centred Innovation (+ others only if they truly fit). 2–3 sentences of evidence each (who it helps, what it changes in daily life, human-centred design choices).
6. **AI/tool disclosure** — fill real model names from role 2:
> Qra Lia uses Google Gemini (<model>) to read document photos, extract structured fields and write the Darija explanation. Groq (<model>) is the automatic fallback. Deterministic code rules (deadlines, legal keywords, scam signs) complement the model's risk assessment. Text-to-speech uses the browser Web Speech API. The team used Claude Code (Anthropic) as a coding assistant; architecture, prompts and testing were done by the team. <If used: the video intro was generated with Higgsfield.> No images or personal data are stored. NVIDIA Brev was not used.
7. **Test evidence:** paste the summary from §4.

Listen to the **13:45 submission briefing** and update this file with anything new.

---

## C8. Slides (Google Slides, 6–7 slides max)
1. Title + one-line pitch + team
2. Problem: stat + real user quote (collected today, with consent, no name if they prefer)
3. Solution: 3 screenshots (photo → result → share)
4. How it works: simple diagram (photo → Gemini → rules → Darija + voice; Groq fallback)
5. Proof: test results table + reliability (fallback, bad photos refused)
6. Responsible AI: no storage · masking · human check · never invents
7. Impact & next steps: WhatsApp bot, Android app, partners (utilities, banks, CNSS, NGOs)

---

## C9. Video (90 s) — `docs/video-script.md`

**French + English subtitles are mandatory** (the jury is international).
| Time | Content |
|---|---|
| 0–15 s | Problem: someone holding a paper they can't read + "1 in 4 Moroccans can't read" |
| 15–60 s | Real phone screen recording: photo → result → 🔊 Darija voice → 📤 send to family |
| 60–75 s | Proof: results table, blurry photo refused, fallback |
| 75–90 s | Responsible AI + next steps + app name/link |

- Record at 16:15 on a real phone (screen recording + one shot of a real person using it, **with consent**).
- Voice-over in Darija (subtitled). No personal data visible on screen.
- Any AI-generated clip must be disclosed and never presented as a real user.
- Export ≤ 90 s, upload **unlisted** (YouTube) or Drive (anyone with link), test the link logged-out.

---

## C10. Timeline
Follow the combined timeline in **Part A §5**.

---

## C11. Definition of done ✅
- [ ] 20+ test images with `expected.json`, personal data covered, never public
- [ ] `eval.ts` produces the table + summary with real numbers
- [ ] Fallback proven once
- [ ] Device test grid filled; bugs reported and closed or noted as limitations
- [ ] README complete
- [ ] submission.md complete (≤150 words summary, awards evidence, disclosure with real model names)
- [ ] Slides ready and shared "view" publicly
- [ ] 90 s video with FR + EN subtitles, link tested logged-out
- [ ] Submitted by 17:15, confirmation screenshot saved
