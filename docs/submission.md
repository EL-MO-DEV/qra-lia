# Submission — Qra Lia (copy-paste into the Google Form)

**Deadline: 17:30 Tunis/Morocco time. Target: submit by 17:15.**
Submit **once**, by the team lead, with the **same team name and lead email** as the Final Team Confirmation. Save the confirmation screenshot.

## 1. Team
- **Team name:** `Qra Lia`
- **Lead email:** the one used in the Final Team Confirmation
- **Country:** Morocco · **Mode:** Online
- **Size:** 3 (Moncef, Sanaa Ouachhal, Youssef Rachi)

## 2. Project title
**Qra Lia — اقرا ليا: AI that reads your paperwork to you in Darija**

## 3. Summary (≤150 words — this one is 135)
One in four Moroccans cannot read, yet electricity bills, bank letters, CNSS and administration papers arrive in French or Modern Standard Arabic. Missed deadlines, penalties and scams follow, and elderly people depend on others to read their own mail. Qra Lia is a mobile web app: photograph any paper and it explains it in Moroccan Darija, in text and out loud — what it is, who sent it, how much, by when, what to do, and whether it looks like a scam. Users can listen, send the explanation to family on WhatsApp, and add a calendar reminder. It runs on Gemini 3.8 Flash (vision) with Groq fallback, deterministic risk and scam rules, number masking and Gemini TTS, with no data stored. Next step: a WhatsApp bot that answers a photo with a Darija voice note.

## 4. The three required links (test each one in a private/incognito window, logged out)
| Field | Link | Checked |
|---|---|---|
| Source code URL | https://github.com/EL-MO-DEV/qra-lia (must be **public**) | ☐ |
| Presentation URL | Google Slides → Share → "Anyone with the link: Viewer" | ☐ |
| 90-second demo video | Loom share link (or unlisted YouTube / Drive "anyone with link") | ☐ |
| (Live app, in README + slides) | https://qra-lia.vercel.app | ☐ |

## 5. Prizes
**Primary: Yassir — AI for Everyday Impact**
> Qra Lia turns a daily, stressful moment — a paper you can't read — into a clear action in the language people actually speak. It works on any phone browser with no install or account: one photo gives the amount, the deadline, what to do and a scam warning, read aloud in Darija. It targets the 1 in 4 Moroccans who cannot read and the elderly who depend on others for every bill.

**Extra: EY Studio+ — Human-Centred Innovation**
> Every design choice follows elderly, low-literacy users: one giant button per screen, text ≥20 px, icon + Darija word + French subtitle on every action, and a single natural voice that can read the whole page. Humans stay in the loop: the app never claims a paper is safe, asks users to check with someone they trust, flags low confidence, and shares only the text explanation with family — never the photo.

## 6. AI / tool disclosure
> Qra Lia uses Google Gemini 3.8 Flash to read document photos, extract structured fields and write the Darija explanation. Groq (Qwen 3.8 27B, vision) is the automatic fallback. Deterministic code rules (deadlines, legal keywords, scam signs, masking of ID/bank/card numbers) complement the model's risk assessment. The voice is Gemini 3.8 Flash TTS (voice "Sulafat"), with Groq Orpheus TTS (canopylabs/orpheus-arabic-saudi, orpheus-v1-english) and then the browser Web Speech API as fallbacks. The app has a Darija/English switch. The team used Claude Code (Anthropic) as a coding assistant; product decisions, architecture, prompts and testing were done by the team. No images or personal data are stored. NVIDIA Brev was not used — the credit request deadline had passed.

_(If a Higgsfield clip is used in the video, add: "The video intro was generated with Higgsfield.")_

## 7. Test evidence
Paste the summary block from `docs/test-results.md` once `scripts/eval.ts` has run. Until then, measured in production:
- Document reading: ~2–6 s per photo (Gemini 3.8 Flash); blurry photos and non-documents refused instead of guessed.
- Fallback chain: Gemini (retries on overload) → Groq → clear Darija error message.
- 15 automated unit tests (masking, risk rules, parser) pass.

## 8. Before pressing Submit
- [ ] Repo is **public**, README complete, **no keys** in the repo (only `.env.example` with empty values)
- [ ] Slides link opens logged out
- [ ] Video ≤ 90 s, FR + EN subtitles, opens logged out, no keys or personal data on screen
- [ ] Live app opens in incognito on a phone
- [ ] Same team name + lead email as the Final Team Confirmation
- [ ] Screenshot of the confirmation page saved
