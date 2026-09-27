// Ported from @SanaaOua's RiskRulesEngineTest, plus parser checks.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REASON_DEADLINE_PASSED, REASON_FEW_DAYS, REASON_LEGAL, REASON_SCAM, REASON_SOON, REASON_VERIFY,
  applyRules, daysLeft, type RuleInput,
} from "./rules";
import { InvalidModelOutput, parseModelOutput } from "./schema";

const TODAY = "2026-09-27";

function base(level: RuleInput["risk_level"], deadline: string, confidence: number, text: string): RuleInput {
  return {
    doc_type: text, sender: "ONEE", action: "خلص", darija_summary: text, deadline,
    risk_level: level, risk_reasons: [], scam_suspected: false, confidence,
  };
}

test("days_left is computed from the Morocco date", () => {
  assert.equal(daysLeft("2026-10-15", TODAY), 18);
  assert.equal(daysLeft(null, TODAY), null);
});

test("overdue deadline is always high", () => {
  const r = applyRules(base("low", "2026-09-26", 0.9, "facture"), TODAY);
  assert.equal(r.risk_level, "high");
  assert.ok(r.risk_reasons.includes(REASON_DEADLINE_PASSED));
  assert.ok((r.days_left ?? 0) < 0);
});

test("3 days or less is at least high", () => {
  const r = applyRules(base("low", "2026-09-29", 0.9, "facture"), TODAY);
  assert.equal(r.risk_level, "high");
  assert.ok(r.risk_reasons.includes(REASON_FEW_DAYS));
});

test("4 to 7 days is at least medium", () => {
  const r = applyRules(base("low", "2026-10-02", 0.9, "facture"), TODAY);
  assert.equal(r.risk_level, "medium");
  assert.ok(r.risk_reasons.includes(REASON_SOON));
});

test("legal keywords force high", () => {
  const r = applyRules(base("low", "2026-10-17", 0.9, "mise en demeure huissier"), TODAY);
  assert.equal(r.risk_level, "high");
  assert.ok(r.risk_reasons.includes(REASON_LEGAL));
});

test("scam signs force high and flag", () => {
  const r = applyRules(base("low", "2026-10-17", 0.9, "أرسل CVV و bit.ly ربحت جائزة"), TODAY);
  assert.equal(r.scam_suspected, true);
  assert.equal(r.risk_level, "high");
  assert.ok(r.risk_reasons.includes(REASON_SCAM));
});

test("low confidence adds the verify reason without raising risk", () => {
  const r = applyRules(base("low", "2026-10-17", 0.4, "facture"), TODAY);
  assert.ok(r.risk_reasons.includes(REASON_VERIFY));
  assert.equal(r.risk_level, "low");
});

test("model high is kept when rules are lower", () => {
  assert.equal(applyRules(base("high", "2026-10-17", 0.9, "facture"), TODAY).risk_level, "high");
});

test("parser strips fences, drops bad dates, clamps confidence", () => {
  const out = parseModelOutput(
    '```json\n{"status":"ok","doc_type":"فاتورة","sender":null,"amount":{"value":340},"deadline":"15/10/2026",' +
      '"action":null,"risk_level":"weird","risk_reasons":[],"scam_suspected":false,"confidence":1.7,"darija_summary":"هادي فاتورة."}\n```',
  );
  assert.deepEqual(out.amount, { value: 340, currency: "MAD" });
  assert.equal(out.deadline, null);
  assert.equal(out.risk_level, "low");
  assert.equal(out.confidence, 1);
});

test("parser rejects non-JSON and missing summary", () => {
  assert.throws(() => parseModelOutput("sorry, I can't read this"), InvalidModelOutput);
  assert.throws(() => parseModelOutput('{"status":"ok","darija_summary":""}'), InvalidModelOutput);
});
