# Qra Lia — WhatsApp prototype (personal number)

A bot on **your own WhatsApp number**: when someone sends a photo of a paper, it replies by itself with the Darija explanation (text) and a voice note. It uses the live Qra Lia API (`/api/read`, `/api/tts`).

> ⚠️ **Prototype only.** This is not the official WhatsApp API (it works like "WhatsApp Web").
> - WhatsApp can **ban the number**. Use a spare SIM if you can.
> - Keep it to a few testers.
> - For real users, switch to the official Cloud API (`/api/whatsapp`, see `docs/whatsapp-setup.md`).

## Who gets an answer
It's your personal number, so the bot **doesn't answer your friends' normal messages**. It answers only:
- testers listed in `ALLOWED_NUMBERS`, when they send a photo;
- anyone who first writes **"Qra Lia"** or **"اقرا ليا"**. They get a welcome message, then their photos are read for 30 minutes.

## Run it (Windows / Mac / Linux)
You need **Node.js 20 or newer** (<https://nodejs.org>).

```bash
cd bot
npm install
npm start
```

A **QR code** appears. On the phone: WhatsApp → ⋮ (or Settings) → **Linked devices** → **Link a device** → scan it.
Then you see `✅ Qra Lia bot connected`. Keep the window open: the bot works while it runs.

Optional, testers who don't need to type "Qra Lia" (international format, no `+`):

```bash
# Windows PowerShell
$env:ALLOWED_NUMBERS="2126XXXXXXXX,2127YYYYYYYY"; npm start
# Mac / Linux
ALLOWED_NUMBERS=2126XXXXXXXX,2127YYYYYYYY npm start
```

## Good to know
- The login session is saved in `bot/auth/`. It's like your WhatsApp password: **never share or commit it** (it's in `.gitignore`). To log out, delete that folder (and remove the device in WhatsApp → Linked devices).
- No photo or document text is saved. The console only shows `read ok gemini low`-style lines.
- Limit: 5 papers per person per 10 minutes.
- If the PC sleeps or closes, the bot stops. To keep it always on, run it on a small server (e.g. a VPS) with `npm start`.
