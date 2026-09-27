// Ported from @SanaaOua's SensitiveDataMaskerTest.
import assert from "node:assert/strict";
import { test } from "node:test";
import { maskText } from "./mask";

test("masks Moroccan CIN keeping last 4", () => {
  assert.equal(maskText("CIN AB123456"), "CIN ••••3456");
  assert.equal(maskText("البطاقة BE98765"), "البطاقة ••••8765");
});

test("masks 24-digit RIB", () => {
  assert.equal(maskText("RIB 007780000012345678901234"), "RIB ••••1234");
});

test("masks IBAN", () => {
  assert.equal(maskText("MA64007780000012345678901234"), "••••1234");
});

test("masks card numbers, with or without spaces", () => {
  assert.equal(maskText("card 4111 1111 1111 1111"), "card ••••1111");
  assert.equal(maskText("4012888888881881"), "••••1881");
});

test("leaves an ordinary sentence unchanged (amounts, contract numbers)", () => {
  const sentence = "فاتورة ONEE ب 247.80 درهم قبل 15 أكتوبر. رقم العقد 998877.";
  assert.equal(maskText(sentence), sentence);
});
