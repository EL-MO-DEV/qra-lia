import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMeds } from "./meds";
import { buildMedsIcs, bySlot, medicineLine, medsSpoken, type MedsResult } from "./medsSchedule";

const RAW = `<think>…</think>{"status":"ok","kind":"prescription","medicines":[
 {"name":"Doliprane 1000 mg","dose":"1 comprimé","slots":["morning","evening","teatime"],"food":"after","duration_days":5,"note":null},
 {"name":"Augmentin 1 g","dose":"1 sachet","slots":["morning","morning","noon","evening"],"food":"with","duration_days":7,"note":null},
 {"name":"Spasfon","dose":null,"slots":[],"food":"sometimes","duration_days":-3,"note":"si douleur"}],
 "warnings":[" "],"confidence":1.4,"summary":"دوليپران حبة فالصباح وحبة فالعشية."}`;

test("model output is validated: unknown slots/food dropped, bad duration nulled, confidence clamped", () => {
  const m = parseMeds(RAW);
  assert.equal(m.medicines.length, 3);
  assert.deepEqual(m.medicines[0].slots, ["morning", "evening"]);
  assert.deepEqual(m.medicines[1].slots, ["morning", "noon", "evening"]);
  assert.equal(m.medicines[2].food, null);
  assert.equal(m.medicines[2].duration_days, null);
  assert.deepEqual(m.warnings, []);
  assert.equal(m.confidence, 1);
  assert.throws(() => parseMeds("nope"));
});

const R = (): MedsResult => ({ ...parseMeds(RAW), provider: "gemini", latency_ms: 1 });

test("schedule groups by time of day; 'if needed' medicines get no slot", () => {
  const groups = bySlot(R().medicines);
  assert.deepEqual(groups.map((g) => [g.slot, g.meds.length]), [["morning", 2], ["noon", 1], ["evening", 2]]);
  assert.equal(medicineLine(R().medicines[0], "ar"), "Doliprane 1000 mg — 1 comprimé · الصباح، العشية · من بعد الماكلة · 5 أيام");
  assert.match(medsSpoken(R(), "ar"), /^الصباح: 1 comprimé Doliprane/);
});

test("calendar: one daily event per time slot, count = longest written duration, local time", () => {
  const ics = buildMedsIcs(R(), "ar", new Date(2026, 9, 5, 9, 30)); // after 08:00 → morning starts tomorrow
  const events = ics.split("BEGIN:VEVENT").length - 1;
  assert.equal(events, 3);
  assert.match(ics, /DTSTART:20261006T080000/);
  assert.match(ics, /DTSTART:20261005T130000/);
  assert.match(ics, /RRULE:FREQ=DAILY;COUNT=7/);
  assert.ok(ics.includes("\r\n"));
});
