# Qra Lia v2 — from hackathon demo to a real product

> Owner: Moncef · Built by Moncef + Claude Code · Living document: tick items as they ship.
> Goal of v2: **an elderly person who can't read uses Qra Lia alone, every month, and trusts it.**

---

## 1. Honest audit: where v1 stands

**Works today (keep it):**
- photo → structured reading → Darija/English explanation;
- Gemini with a Groq fallback;
- risk and scam rules;
- masking of ID/bank/card numbers;
- voice output, with fallbacks;
- share to WhatsApp (text only);
- `.ics` reminder;
- installable PWA with an offline page;
- Majorelle UI in light and dark.

**Fragile or missing (blocks real users):**

| # | Problem | Why it matters |
|---|---|---|
| 1 | **Free AI tiers.** The Gemini quota is exhausted daily. Groq allows ~1 read per minute (1000 output tokens/min). | Ten users at the same time means errors. |
| 2 | **Free-tier data terms.** On unpaid tiers, Google may use the content sent to improve its products (check the current Gemini API terms). | Not acceptable for people's bills and bank letters. |
| 3 | **Zero visibility.** The Vercel Hobby plan keeps logs for 1 hour. There are no analytics and no error tracking. | We don't know if anyone uses it, or where it breaks. |
| 4 | **No privacy policy or terms.** Moroccan law 09-08 / CNDP applies to personal data. | Partners, associations and stores will ask for them first. |
| 5 | **Never tested with real elderly users.** | Every assumption so far is ours, not theirs. |
| 6 | **Bad photos cost a full AI call** before we say "retake". | Slow, expensive, frustrating. |
| 7 | **Reminders are a `.ics` file.** | Elderly users don't know what to do with a calendar file. |
| 8 | **No memory.** Every paper is forgotten when the page closes. | "What did that letter say last week?" has no answer. |
| 9 | **No voice input.** A user who can't read can't type a question either. | Follow-up questions are impossible. |
| 10 | **Explains, but doesn't help act** (pay, call, go). | The job isn't done when the user still doesn't know where to go. |
| 11 | **The voice is Standard Arabic / Saudi-accented,** not Moroccan. | Understanding and trust both suffer. |

---

## 2. Who we build for

| Persona | Situation | What they need from us |
|---|---|---|
| **Mi Fatna, 67, Casablanca** — can't read | Hand-me-down Android, sends WhatsApp voice notes every day, gets ONEE/Lydec bills and bank letters, scared of penalties and scams | Hear it. One button. "Do I have to pay? How much? By when?" Ask her son. |
| **Si Ahmed, 55, artisan in Fès** — reads a little Arabic, no French | CNSS, DGI (taxes) and bank letters, plus court or bailiff papers sometimes | French → Darija, *what to do*, *where to go*, *which papers to bring* |
| **Youssef, 30, the son** (Rabat, or a Moroccan abroad) | Manages his parents' papers from far away | Receive a clear summary, know the deadlines, get reminded |
| **The helper** (literacy association, mqaddem, bank or post-office agent) | Helps dozens of people a week | Fast, reliable, shareable explanations (later: B2B) |

**Jobs to be done, in the user's words:**
1. "Tell me if I have to do something, how much, and before when." ✅ v1
2. "Is this message real, or is it a scam?" → mostly **SMS/WhatsApp screenshots**, the #1 scam channel.
3. "Don't let me forget." → must reach them where they are (notification / WhatsApp), not a file.
4. "Help me do it." → call, pay, go to the agency.
5. "Let my family check." ✅ v1, improve it.
6. "I can't type." → **voice in**, not just voice out.
7. "I don't want an app that keeps my papers." → no account, nothing stored on our side, and say so clearly.

**Key insight:** WhatsApp is the operating system of Moroccan families. The web app is the showroom and the fallback; **WhatsApp becomes the main channel** in v2.1.

---

## 3. Product principles (every feature is checked against these)

1. **One screen, one action.** One giant button; everything else is secondary.
2. **Zero typing.** Photo in, voice in, voice out.
3. **Zero account.** Open and use. Anything personal stays on the phone.
4. **Privacy by default.** No photos stored; on our side, nothing that identifies a person.
5. **Works on a cheap Android over 3G.** Small pages, compressed images, no heavy libraries.
6. **Never invent.** Unsure → say so → suggest checking with someone.
7. **Act only with official data.** Phone numbers and payment links come from **our verified list**, never from the photo (anti-scam).

---

## 4. v2 features (prioritized)

Effort: **S** ≤ 1 day · **M** 2–4 days · **L** 1–2 weeks.

### Must — v2.0

| ID | Feature | What the user sees | How we build it | Effort |
|---|---|---|---|---|
| F1 | **Smart camera** | A frame to place the paper in. "Too dark" / "Blurry, hold still" before anything is sent. Up to 3 pages per paper. | On the phone: brightness + blur check (Laplacian variance) on a canvas, before upload. Multi-image request to `/api/read`. | M |
| F2 | **Share to Qra Lia** | In WhatsApp/Gallery → Share → **Qra Lia** | PWA Web Share Target (`share_target` in the manifest). The service worker receives the file and hands it to the page. Nothing is stored on a server. | M |
| F3 | **Scam check mode** | A big verdict: 🔴 scam / 🟢 looks normal / 🟠 not sure, plus "what NOT to do" | Same pipeline, a dedicated prompt + rules for SMS/WhatsApp screenshots. Known official sender names and domains. | S |
| F4 | **Act buttons** | 📞 Call ONEE · 📍 Nearest agency · 💳 Pay online (official app/site) | Curated `senders.json`: ONEE, Lydec, Redal, Amendis, IAM, Orange, inwi, CNSS, AMO, DGI, main banks, Barid. Matched on the sender name. Links come **only** from this list. | M |
| F5 | **Ask by voice ("Swwel")** | Hold the mic: "Can I pay in instalments?" → answer in text + voice | Mic → Groq Whisper (speech-to-text) → `/api/ask` with the **extracted fields only** (not the image) → answer + TTS | M |
| F6 | **My papers (on the phone)** | Home shows "⏰ 2 deadlines coming", the list of papers, "mark as paid", delete | IndexedDB on the device only. Never sent to us. One-tap delete-all. | M |
| F7 | **Reminders that reach people** | "Remind me" → a phone notification 2 days before (+ the `.ics` option) | Web Push (Android, and iPhone when installed). The server keeps only the push subscription + date + a generic text, deleted after sending. Supabase (EU) + Vercel Cron. | L |
| F8 | **Trust pack** | Privacy page in simple Darija + legal French, terms, 👍/👎 on every result | Static pages. Anonymous feedback counter (no document data). | S |
| F9 | **Accessibility+** | Text size A / A+ / A++, "read the result automatically", 3-step voice tutorial the first time | CSS scale variable + localStorage. Tutorial with the existing TTS. | S |

### Should — v2.1

| ID | Feature | Notes | Effort |
|---|---|---|---|
| F10 | **WhatsApp bot** | Send a photo → get a Darija text + **voice note**. Reminders through template messages. Needs Meta Business verification + a phone number. Uses the same `/api/read`. | L |
| F11 | **Family link** | "Ask my son": a private link (text only, expires in 7 days); the helper can reply with a voice note | L |
| F12 | **A real Moroccan voice** | Test 3–4 TTS voices with 10 elderly listeners; keep the one they understand best; cache the audio | M |
| F13 | **French UI + Darija in Latin letters** | Many young helpers read "Arabizi" better | S |

### Could — v3
Tamazight (Tachelhit first) · Play Store app (TWA via Bubblewrap, wraps the PWA) · PDF/e-mail import · partner dashboard / B2B API · on-device OCR to work offline.

### Won't (on purpose)
Accounts and passwords · storing photos · payments inside the app · ads · asking users for any code or card number.

---

## 5. Technical plan

```
Phone (PWA)                                   Server (Vercel, Next.js)
├─ smart camera checks (F1)                   ├─ /api/read   Gemini (paid) → Groq (paid) → rules → mask
├─ share target via service worker (F2)       ├─ /api/ask    extracted JSON + question → answer (F5)
├─ My papers in IndexedDB (F6)                ├─ /api/stt    Groq Whisper (F5)
├─ text size / auto-read (F9)                 ├─ /api/tts    Gemini TTS → Groq Orpheus → phone voice
└─ push subscription (F7)  ───────────────▶  ├─ /api/remind  store {subscription, date, generic text}
                                              └─ cron: send due pushes, then delete rows
                                       Supabase (EU): reminders + feedback counts only, no documents
```

- **AI, paid tiers with hard caps:**
  - Gemini (reading + TTS): a monthly budget alert.
  - Groq (fallback + Whisper): developer tier.
  - Our own guard: per-IP limit and a global daily budget.
- **Observability:**
  - Sentry for errors, with no personal data;
  - cookie-less analytics (Vercel Analytics or Plausible);
  - events only: `read_ok`, `read_fail`, `listen`, `share`, `remind`, `feedback`, never document content.
- **Quality:**
  - an eval set of 50 → 100 real (masked) papers;
  - `scripts/eval.ts` run weekly and on every prompt change;
  - prompts versioned in the code.
- **CI:** GitHub Actions on every PR runs lint + typecheck + tests + build. Nothing is merged red.
- **Security:**
  - security headers (CSP);
  - Vercel firewall rate limits;
  - Dependabot;
  - secrets only in Vercel.
- **Hosting:** Vercel Hobby is meant for non-commercial use. Move to Pro when partners or revenue arrive (check Vercel's terms).
- **Legal:**
  - privacy policy + terms;
  - check with the CNDP whether a declaration is required (law 09-08);
  - processor terms of the AI providers (paid tiers).

---

## 6. The "agency" — who does what

| Role | Responsibility | Who |
|---|---|---|
| Product lead | Priorities, scope, "no" to feature creep, this plan | Moncef (decides) · Claude (proposes) |
| UX researcher | Field tests with elderly users, interview script, findings | Moncef in the field · Claude writes the script + analyses notes |
| UX/UI designer | Flows, screens, voice tutorial, Majorelle system | Claude (proposals + screenshots) · Moncef (approves) |
| Frontend dev | PWA, camera, share target, IndexedDB, push | Claude |
| Backend / AI | Prompts, `/api/*`, eval, cost guard | Claude |
| QA | Device tests (cheap Android, iPhone), eval runs | Claude (automated) · Moncef (real phones) |
| DevOps / security | CI, Sentry, Supabase, Vercel, keys | Claude sets up · Moncef owns accounts + keys |
| Legal / privacy | Policy, terms, CNDP | Claude drafts · a lawyer / the CNDP site validates |
| Growth & partnerships | Associations, utilities, banks, reels, Play Store | Moncef · Claude prepares decks, reels, copy |

---

## 7. Roadmap

| Sprint | Theme | Content | Done when |
|---|---|---|---|
| **0** (2–3 days) | **Foundation** | CI · Sentry + analytics · paid AI keys + budget caps · privacy + terms pages · 👍/👎 feedback · eval set (30 papers) baseline | A red PR can't merge. We see real usage. The first eval numbers exist. |
| **1** (week 1–2) | **Easy in** | F1 smart camera · F2 share to Qra Lia · F3 scam check · F9 accessibility | A screenshot from WhatsApp gets a scam verdict in 2 taps |
| **2** (week 2–3) | **Help me act** | F4 act buttons · F5 ask by voice · F6 My papers | "Where do I pay?" is answered by voice |
| **3** (week 4–5) | **Never miss a deadline** | F7 push reminders · **field test #1** (10–15 elderly users) | ≥ 80 % of testers finish the 5 tasks without help |
| **4** (week 6–8) | **Where they are** | F10 WhatsApp bot · F11 family link · F12 voice | Photo on WhatsApp → voice note back |
| **Launch** | **Soft launch** | 1 partner association · Play Store (TWA) · reels in Darija | 100 weekly users, 👍 ≥ 85 % |

---

## 8. Field test plan (start during sprint 1)

- **Who:** 10–15 people aged 55+. Half can't read at all. Recruit through family and one literacy association.
- **Consent:** spoken consent; no names, no photos of faces; papers masked.
- **5 tasks** (we watch, we don't help):
  1. Photograph a bill.
  2. Listen to the explanation.
  3. Send it to a family member.
  4. Check a scam SMS.
  5. Set a reminder.
- **Measure:** success yes/no, time, where they hesitate, the words they use (→ our labels).
- **Output:** `docs/field-test-1.md` with the top 5 problems → they become the next sprint.

---

## 9. Success metrics

| Metric | Target |
|---|---|
| Amount and deadline correct (eval set) | ≥ 95 % |
| Time from photo to answer (median) | ≤ 6 s |
| Bad photos sent to the AI (after F1) | −70 % |
| Elderly testers finish the tasks alone | ≥ 80 % |
| 👍 rate | ≥ 85 % |
| Results listened / shared / reminder set | tracked weekly |
| AI cost per read | under the monthly cap |
| Weekly active users, 4-week retention | tracked from launch |

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| A wrong amount or deadline on a legal or financial paper | Never the final word, "check with someone", conservative risk, eval before every prompt change |
| Privacy breach / loss of trust | Nothing stored, paid AI tiers, masking, public privacy page, CNDP check |
| AI costs explode | Hard caps, bad photos stopped on the phone, rate limits, partner sponsorship |
| Fake "Qra Lia" scams | One official domain; the app never asks for codes or money, and says so |
| Dependence on one provider | Gemini → Groq fallback is already in place; keep both paid |
| WhatsApp API cost / policy | Start with free user-initiated conversations; reminders only with opt-in |

---

## 11. Business model (keep it simple)

- **Free for people, always.**
- **Partners pay:**
  - utilities, banks and telcos sponsor "explain my bill" (better on-time payment, fewer agency visits);
  - NGOs and digital-inclusion programmes;
  - grants and prizes.
- **Later:** a B2B API for call centers and agencies.

---

## 12. Decisions needed from Moncef (blockers)

1. **Team in v2:** only Moncef + Claude (the whole repo becomes Moncef's, update `CLAUDE.md`), or Sanaa and Youssef stay (we keep the ownership rules)?
2. **Monthly budget** for AI + tools (a small cap to start), so we can switch to paid keys.
3. **Accounts:** Supabase project (EU) · Sentry · domain name (e.g. `qralia.ma`).
4. **First 10 testers:** who and where.

## 13. Progress

**Done:**
- [x] WhatsApp prototype bot, live on Railway (personal number, testers in `ALLOWED_NUMBERS`)
- [x] Official Cloud API webhook ready (`/api/whatsapp`); needs a Meta app to switch on
- [x] F7 (WhatsApp version): reminders 2 days before the deadline (text + voice)
- [x] F5: questions by voice or text about the last paper (`/api/stt`, `/api/ask`)
- [x] Vercel Web Analytics (cookie-less page views); switch it on in the Vercel dashboard

## 14. Next (no account needed)

- [x] CI: GitHub Actions (lint, typecheck, tests, build)
- [x] F8: privacy + terms page (`/privacy`) · [ ] 👍/👎 feedback (needs a small database)
- [ ] F1: smart camera (brightness + blur check, guide frame)
- [ ] F2 + F3: share to Qra Lia + scam check mode
- [ ] F9: text size + auto-read + first-run voice tutorial
