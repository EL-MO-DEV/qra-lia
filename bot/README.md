# Qra Lia — WhatsApp prototype (personal number)

A bot on **your own WhatsApp number**: when someone sends a photo of a paper, it replies by itself with the Darija explanation (text) and a voice note. It uses the live Qra Lia API (`/api/read`, `/api/tts`).

> ⚠️ **Prototype only.** This is not the official WhatsApp API (it works like "WhatsApp Web").
> - WhatsApp can **ban the number**. Use a spare SIM if you can.
> - Keep it to a few testers.
> - For real users, switch to the official Cloud API (`/api/whatsapp`, see `docs/whatsapp-setup.md`).

## What it does
- **Photo of a paper** → explanation in Darija (text) + voice note.
- **Questions** for 30 min after a paper: send a **voice note** or a text ("can I pay at the bank?") → answer in text + voice (`/api/stt` + `/api/ask`, answers only from that paper's data).
- **Reminders:** when the paper has a deadline ≥ 2 days away, the bot asks "⏰ remind you?". Answer *ايه* → 2 days before, at 10:00, it sends a reminder (text + voice). *لغي* cancels. Reminders live in `qra-reminders.json` next to the session (on the volume) and are deleted once sent.

## Who gets an answer
It's your personal number, so the bot **doesn't answer your friends' normal messages**. It answers only:
- testers listed in `ALLOWED_NUMBERS`, when they send a photo;
- anyone who first writes **"Qra Lia"** or **"اقرا ليا"**. They get a welcome message, then their photos are read for 30 minutes.

## Put it live on Railway (always on, the whole team can test)
1. <https://railway.com> → sign in with GitHub → **New Project** → **Deploy from GitHub repo** → `EL-MO-DEV/qra-lia`.
2. Service → **Settings**:
   - **Root Directory** = `bot`;
   - **Networking → Generate Domain**.
3. Service → **Variables**:
   - `QR_PASSWORD` = a password you choose;
   - `AUTH_DIR` = `/data/auth`;
   - `ALLOWED_NUMBERS` = your number + the testers' numbers (e.g. `2126XXXXXXXX,2127YYYYYYYY`).
4. Service → **Volumes** → **New Volume**, mount path `/data`. Without it, you'd have to scan again after each redeploy.
5. Once it's deployed, open `https://<your-railway-domain>/qr?key=<QR_PASSWORD>` and scan the QR with WhatsApp (Linked devices). The page then shows **✅ البوت متصل**.

To add or remove a tester, edit `ALLOWED_NUMBERS` in Variables (Railway restarts the bot, and the session is kept).
Cost: Railway's trial/hobby plan, a few dollars a month for a small bot (check their pricing).

## Run it on a PC (Windows / Mac / Linux)
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
