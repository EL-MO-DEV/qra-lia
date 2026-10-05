import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanTargets, locatePrompt, parseBoxes } from "./locate";

test("targets: only known fields, short strings", () => {
  assert.deepEqual(cleanTargets({ amount: "340 MAD", deadline: "2026-10-15", evil: "x", sender: "" }), { amount: "340 MAD", deadline: "2026-10-15" });
  assert.equal(cleanTargets({ amount: "x".repeat(200) }), null);
  assert.equal(cleanTargets(null), null);
});

test("prompt lists only the requested targets", () => {
  const p = locatePrompt({ amount: "340 MAD" });
  assert.match(p, /amount/);
  assert.doesNotMatch(p, /- deadline/);
});

test("0-1000 boxes become fractions; junk and duplicates are dropped", () => {
  const raw = '```json\n{"items":[{"field":"amount","box_2d":[100,200,150,400]},{"field":"amount","box_2d":[0,0,10,10]},{"field":"deadline","box_2d":[0,0,1000,1000]},{"field":"hack","box_2d":[1,2,3,4]}]}\n```';
  const boxes = parseBoxes(raw);
  assert.equal(boxes.length, 1);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const [b] = boxes;
  assert.equal(b.field, "amount");
  assert.ok(near(b.x, 0.2) && near(b.y, 0.1) && near(b.w, 0.2) && near(b.h, 0.05));
});

test("pixel boxes are normalized with the image size; unknown size drops them", () => {
  const raw = '{"items":[{"field":"sender","box_2d":[120,80,240,880]}]}'.replace("880", "1600");
  assert.equal(parseBoxes(raw).length, 0);
  const [b] = parseBoxes(raw, 2000, 1200);
  assert.equal(b.field, "sender");
  assert.ok(Math.abs(b.x - 0.04) < 1e-9 && Math.abs(b.y - 0.1) < 1e-9 && Math.abs(b.w - 0.76) < 1e-9 && Math.abs(b.h - 0.1) < 1e-9);
  assert.deepEqual(parseBoxes("not json"), []);
});
