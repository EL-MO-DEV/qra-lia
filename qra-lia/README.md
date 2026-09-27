# Qra Lia (اقرا ليا) — Frontend Core UI

Role 3 build, per the CDC handed to this assistant. Owns:

```
app/page.tsx
app/globals.css
components/UploadPanel.tsx
components/Loading.tsx
components/ResultCard.tsx
components/ErrorState.tsx
components/SafetyNote.tsx
lib/compress.ts
lib/api.ts
```

Also included, purely as **stand-ins** so this package runs on its own before
it's merged with the rest of the team's code — replace with the real files
from `main` at integration time, do not edit them here:

- `lib/types.ts`, `lib/mock.ts` — owned by Moncef.
- `app/layout.tsx`, and the `package.json` / `tsconfig.json` / Tailwind /
  Next config — normally already set up by Moncef.

**Update (integrated):** `ResultCard.tsx` now imports the real
`ListenButton` / `ShareButton` / `ReminderButton` from `@/components/*`
(Moncef confirmed these already exist). The old disabled placeholder file
has been removed. If his actual filenames/exports differ from
`ListenButton.tsx` / `ShareButton.tsx` / `ReminderButton.tsx`, just fix the
three import lines at the top of `ResultCard.tsx` — nothing else changes.

**Font:** `globals.css` now uses a single `--font-sans: var(--font-qra)`
token everywhere (the page is fully RTL, so there's no separate
Arabic/Latin font split anymore). `--font-qra` is defined in `app/layout.tsx`
via `next/font/google` (Noto Kufi Arabic) as a working placeholder — if
Moncef's real layout already defines `--font-qra` differently, keep his and
drop this one.

## Run it

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/?mock=ok` — happy path (water bill, 340 MAD, 18 days left)
- `http://localhost:3000/?mock=unreadable` — blurry photo error path
- `http://localhost:3000/?mock=scam` — high-risk / scam banner + low-confidence banner together

With no `?mock=` param the page calls the real `POST /api/read` once that
route exists (Backend/AI's part).

## State machine

`idle → compressing → uploading → result`, with `error` reachable from
`uploading` and looping back to `idle` via "صوّر ورقة أخرى". Implemented with
a single `useReducer` in `app/page.tsx` — only one screen is ever mounted.

## Notes for integration (13:00 checkpoint)

- Swap `lib/types.ts` and `lib/mock.ts` for Moncef's real files (should be
  identical in shape to these placeholders).
- Swap `components/FeatureButtons.tsx` imports in `ResultCard.tsx` for
  Moncef's real `ListenButton` / `ShareButton` / `ReminderButton`.
- `lib/api.ts` already targets `POST /api/read` with a 30s timeout and throws
  `{ error: "network" }` on failure/timeout, and the parsed `ApiError` body on
  a non-200 response — matches the contract in the CDC.
