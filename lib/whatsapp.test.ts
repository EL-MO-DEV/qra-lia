import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { messagesOf, validSignature, verifyChallenge, wavToMp3 } from "./whatsapp";

process.env.WHATSAPP_APP_SECRET = "secret";
process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";

test("only Meta-signed payloads are accepted", () => {
  const body = '{"entry":[]}';
  const good = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
  assert.equal(validSignature(body, good), true);
  assert.equal(validSignature(body + " ", good), false);
  assert.equal(validSignature(body, "sha256=00"), false);
  assert.equal(validSignature(body, null), false);
});

test("webhook verification echoes the challenge only with our token", () => {
  const ok = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "42" });
  assert.equal(verifyChallenge(ok), "42");
  ok.set("hub.verify_token", "wrong");
  assert.equal(verifyChallenge(ok), null);
});

test("messages are read from the webhook payload, statuses ignored", () => {
  const payload = {
    entry: [
      { changes: [{ value: { messages: [{ id: "a", from: "212600000000", type: "image", image: { id: "m1", mime_type: "image/jpeg" } }] } }] },
      { changes: [{ value: { statuses: [{ id: "s" }] } }] },
    ],
  };
  const msgs = messagesOf(payload);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].image?.id, "m1");
  assert.deepEqual(messagesOf(null), []);
});

test("WAV from /api/tts becomes a playable MP3", async () => {
  const rate = 16000;
  const samples = rate; // 1 second
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), 44 + i * 2);
  const mp3 = await wavToMp3(new Uint8Array(wav));
  assert.ok(mp3.length > 1000);
  assert.equal(mp3[0], 0xff); // MPEG frame sync
});
