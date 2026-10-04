# WhatsApp bot — setup (official WhatsApp Cloud API)

How it works: the user sends a photo to the Qra Lia number → the bot replies by itself (automatic) with the Darija explanation as text, then as a voice note. The code is `app/api/whatsapp/route.ts` (webhook) + `lib/whatsapp.ts`.

Keys go **only** into Vercel (Settings → Environment Variables). Never in the chat, the repo or a screenshot.

## 1. Meta app (Moncef, ~10 min)
1. Go to <https://developers.facebook.com> → **My Apps → Create App** → type **Business**.
2. In the app, add the product **WhatsApp** → **API Setup**.
3. Meta gives a **free test number**. Under "To", add your own phone number (and the testers', up to a few) and confirm the codes they receive.
4. Note these values (do not paste them in the chat):
   - **Phone number ID** (API Setup page) → `WHATSAPP_PHONE_NUMBER_ID`
   - **Access token** → `WHATSAPP_TOKEN`. The temporary one lasts 24 h. For the pilot, create a permanent token: Business Settings → System users → generate a token with `whatsapp_business_messaging` + `whatsapp_business_management`.
   - **App secret** (App settings → Basic) → `WHATSAPP_APP_SECRET`
   - Choose any long random word for `WHATSAPP_VERIFY_TOKEN`.

## 2. Vercel (Moncef)
Add the 4 variables in Vercel (Production), then **Redeploy** the latest production deployment.

## 3. Connect the webhook (Moncef, in Meta)
WhatsApp → **Configuration** → Webhook → Edit:
- Callback URL: `https://qra-lia.vercel.app/api/whatsapp`
- Verify token: the same `WHATSAPP_VERIFY_TOKEN`
- Click **Verify and save**, then **subscribe** to the `messages` field.

## 4. Test
From your phone, send "salam" to the test number → welcome message. Send a photo of a bill → "⏳ كنقرا الورقة…", then the explanation, then the voice note.

## Later (pilot with real users)
- A new SIM card dedicated to Qra Lia, added as a real number in WhatsApp Manager.
- Answering by hand on the same number as the bot ("coexistence" with the WhatsApp Business app): check whether it is available for Morocco in Meta's docs at that time.
- Business verification when we grow beyond the starting limits.

## Privacy
- No photo, phone number or document text is stored or logged. Logs keep only the status, provider and risk level.
- Every webhook call is checked against the Meta signature (`X-Hub-Signature-256`).
