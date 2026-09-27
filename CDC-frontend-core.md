# CDC — Frontend Core UI · Qra Lia (اقرا ليا)

> Specification for **Role 3: Frontend Core UI**. Give this whole file to your AI assistant before coding.
> Tech lead / integrator: **Moncef** (only he merges into `main`).
> Hackathon: GOMYCODE × NVIDIA "Come Build with AI" — Sunday 27 Sept 2026 — submission 17:30 (Morocco time).
> **Team of 3:** Moncef (Tech Lead + Features/PWA + QA/Delivery), Backend/AI, Frontend Core. Only edit the files listed as yours below; if you need a change in someone else's file, ask them in the group.

---

## 1. Context in 30 seconds

Qra Lia is a mobile-first web app. The user takes a photo of a paper document (bill, bank letter, CNSS, administration letter). The app explains it in **Moroccan Darija**, in text and out loud: what it is, who sent it, how much, the deadline, what to do, and if it's risky or a scam.

**Our users are elderly and low-literacy people.** Every design choice follows from that: big, simple, one action at a time, Arabic-script Darija, voice.

You build **the screens**: home, upload, loading, result card, errors.

---

## 2. Scope

**You own (only you edit these):**
```
app/page.tsx                 # the single page (client component)
app/globals.css              # design tokens + base styles
components/UploadPanel.tsx   # big camera button + gallery link
components/Loading.tsx
components/ResultCard.tsx
components/ErrorState.tsx
components/SafetyNote.tsx
lib/compress.ts              # image compression in the browser
lib/api.ts                   # fetch wrapper for /api/read
```
**Read-only for you:** `lib/types.ts`, `lib/mock.ts` (Moncef), feature components from Moncef.
**Out of scope:** the API itself, TTS, share, reminder, PWA (Moncef builds those as components you place in the card).

---

## 3. Stack
Next.js App Router + TypeScript + Tailwind (already set up by Moncef). No extra UI library needed. No `localStorage`, no database.

---

## 4. The contract you consume

From `lib/types.ts` (do not change it — ask Moncef):
```ts
type ReadResult = {
  status: "ok" | "unreadable" | "not_a_document";
  doc_type: string | null; sender: string | null;
  amount: { value: number; currency: string } | null;
  deadline: string | null; days_left: number | null;
  action: string | null;
  risk_level: "low" | "medium" | "high"; risk_reasons: string[];
  scam_suspected: boolean; confidence: number;
  darija_summary: string; provider: "gemini" | "groq"; latency_ms: number;
};
type ApiError = { error: "invalid_input" | "image_too_large" | "rate_limited" | "ai_unavailable" | "internal"; darija_message?: string };
```
**Start with `lib/mock.ts`** (`MOCK_OK`, `MOCK_UNREADABLE`, `MOCK_SCAM`) so you never wait for the backend. Add a dev-only switch: `?mock=ok|unreadable|scam` in the URL returns the mock instead of calling the API.

---

## 5. Page state machine (`app/page.tsx`)

```
idle ──photo chosen──▶ compressing ──▶ uploading ──▶ result
  ▲                                         │
  └──────────── "صوّر ورقة أخرى" ◀── error ◀─┘
```
Use one `useReducer` (or `useState` with a union type). Only one screen visible at a time.

---

## 6. Components

### `UploadPanel`
- Giant primary button: 📸 **صوّر الورقة** (small subtitle: *Prendre une photo*).
- Under it, a text link: 🖼️ **ولا اختار من الصور** (*ou choisir dans la galerie*).
- Two hidden inputs:
  - camera: `<input type="file" accept="image/*" capture="environment">`
  - gallery: `<input type="file" accept="image/*">`
- One line of reassurance: "الصورة ما كتحفظش عندنا" (*Votre photo n'est pas enregistrée*).

### `Loading`
- Text: **كنقرا الورقة…** (*Lecture en cours…*), a calm animated indicator, the thumbnail of the photo.
- After 8 s add: "شوية صبر، قريب نساليو" (*Encore quelques secondes*).

### `ResultCard` — order matters (most important first)
1. **Risk badge** — 🟢 عادي / 🟠 رد البال / 🔴 خطر. If `scam_suspected`: full-width red banner "⚠️ هادي فيها علامات ديال النصب" + `risk_reasons` as a short list.
2. **What it is**: `doc_type` + `sender`.
3. **Amount + deadline — biggest text on the screen**: "340 درهم" · "قبل 15 أكتوبر" · `days_left` as "بقاو 18 يوم" (if `< 0`: "الأجل فات").
4. **What to do**: `action` with ✅ icon.
5. **Darija explanation**: `darija_summary` in a readable block (`dir="rtl"`, generous line height).
6. **Action row (components from Moncef)**: `<ListenButton text={result.darija_summary} />` · `<ShareButton result={result} />` · `<ReminderButton result={result} />` (only rendered when `deadline` exists).
7. **`SafetyNote`**: "إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه". If `confidence < 0.6`, show it as a yellow banner at the TOP instead.
8. Secondary button: 📸 **صوّر ورقة أخرى**.

Hide any row whose field is `null` (never print "null" or empty labels).

Until Moncef's components exist, render simple placeholder buttons with the same props so integration is a one-line swap.

### `ErrorState`
Direction, not apology. One message + one retry button.
| Case | Message |
|---|---|
| `status: unreadable` | الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون. |
| `status: not_a_document` | هادي ما باناتش ورقة. صوّر الورقة كاملة من الفوق. |
| `invalid_input` / `image_too_large` | ما قدرناش نقراو هاد الصورة. جرب صورة أخرى. |
| `rate_limited` | بزاف ديال الطلبات. تسنى دقيقة وعاود. |
| `ai_unavailable` | show `darija_message` from the API |
| network / timeout | كاين مشكل فالأنترنت. عاود من بعد شوية. |

Add a small tip block for unreadable photos: 💡 فضو مزيان · 💡 الورقة كاملة فالتصويرة · 💡 ما تحركش التيليفون.

---

## 7. `lib/compress.ts`
```ts
export async function compressImage(file: File, maxSide = 1600, quality = 0.8):
  Promise<{ base64: string; mimeType: "image/jpeg"; previewUrl: string }>
```
- Draw into a canvas, longest side ≤ `maxSide`, export JPEG at `quality`.
- Respect EXIF orientation (use `createImageBitmap(file, { imageOrientation: "from-image" })` where supported).
- Return base64 **without** the `data:` prefix + an object URL for the thumbnail (revoke it when leaving the result screen).
- If the result is still > ~3 MB, retry once at `quality = 0.6`.

## 8. `lib/api.ts`
```ts
export async function readDocument(req: ReadRequest): Promise<ReadResult>  // throws ApiError-like errors
```
- `POST /api/read`, JSON body, 30 s timeout with `AbortController`.
- Non-200 → parse `ApiError` and throw it; network failure/timeout → throw `{ error: "network" }` (frontend-only code).

---

## 9. Design requirements

**Accessibility for elderly users (non-negotiable):**
- Body text ≥ 20px; amount/deadline ≥ 32px; buttons ≥ 56px tall, full width on mobile.
- Contrast WCAG AA minimum. Never rely on color alone (badge = color + icon + word).
- One primary action per screen. Icons next to every label.
- Arabic-script Darija blocks: `dir="rtl"`, line-height ~1.8. French subtitles small, below, `dir="ltr"`.
- Respect `prefers-reduced-motion`. Visible focus states.

**Look & feel:**
- Calm and trustworthy, not a generic SaaS template, not a cliché "Moroccan tiles" look.
- Define color/spacing/type tokens as CSS variables in `globals.css`; support light and dark (`prefers-color-scheme`).
- One memorable element: the giant camera button on the home screen.
- Font: a highly legible Arabic font with a Latin companion (e.g. from Google Fonts) + solid system fallbacks.
- Mobile-first (test at 360px wide), then make it look good on desktop (centered column, max ~480px) because the jury may open it on a laptop.
- Keep content clear of phone notches: `padding` with `env(safe-area-inset-*)`.

---

## 10. Team rules
- Branch `ui-core`, small commits (`feat(ui): result card`), PR to `main`. Only Moncef merges.
- Don't edit files owned by others; ask in the group.
- Never commit keys or real documents.
- Blocked > 20 min → tell the group, take the simpler option.

---

## 11. Timeline (event day)
| Time | Deliverable |
|---|---|
| 11:15–12:00 | State machine + UploadPanel + compress + Loading, working with `?mock=ok` |
| 12:00–13:00 | ResultCard (all rows, null handling, badges) + ErrorState with all mocks |
| **13:00** | **Integration with real `/api/read` (PR to `main`)** |
| 13:45–14:45 | Polish on real phones (Android + iPhone), dark mode, desktop layout |
| 14:45–15:00 | Swap placeholders for Moncef's feature buttons (stubs arrive ~11:15) |
| **15:00** | **Feature freeze** |
| 15:00–16:15 | Bug fixes only; if Moncef asks: device tests + screenshots for slides |
| **16:15** | **Code freeze** — help record the demo |

---

## 12. Definition of done ✅
- [ ] Photo from camera AND gallery works on Android and iPhone
- [ ] Images compressed (check the request size in DevTools)
- [ ] All 3 mocks render correctly; no "null" ever shown
- [ ] Every error case shows the right Darija message + retry
- [ ] Amount and deadline are the biggest thing on the result screen
- [ ] Safety note always visible; yellow banner when confidence < 0.6
- [ ] Scam banner shows reasons
- [ ] Looks good at 360px and on desktop, light + dark
- [ ] Moncef's feature buttons integrated in the action row
