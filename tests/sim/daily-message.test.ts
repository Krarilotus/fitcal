import test from "node:test";
import assert from "node:assert/strict";
import { getDailyMessage } from "@/lib/special-day";

function buildContext(overrides: Partial<Parameters<typeof getDailyMessage>[0]> = {}) {
  return {
    currentDate: "2026-04-02",
    currentTarget: 4,
    name: "Daniel",
    birthDate: null,
    heightCm: 178,
    latestWeightKg: 71,
    latestWaistCm: 82,
    outstandingDebtCents: 0,
    documentedDays: 5,
    motivation: null,
    ...overrides,
  };
}

test("german daily message avoids the broken 'dass erschien' grammar", () => {
  const message = getDailyMessage(buildContext(), "de");

  assert.doesNotMatch(message, /dass erschien/i);
  assert.match(
    message,
    /Im Kalender steht heute:|Heute gilt:|Für heute bleibt hängen:|Die Datumsnotiz für heute lautet:|Heute erschien/i,
  );
});

test("english daily message stays fully english", () => {
  const message = getDailyMessage(buildContext(), "en");

  assert.doesNotMatch(message, /Heute|Kalender|Liegestütz|Bauchumfang/i);
  assert.match(message, /today|calendar|logged|weight/i);
});

test("german April 9 message avoids broken subordinate grammar", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-04-09",
    }),
    "de",
  );

  assert.doesNotMatch(message, /dass hängen/i);
  assert.doesNotMatch(message, /Für heute bleibt hängen, dass/i);
  assert.match(message, /Widerstandsgeschichten|NS-Zeit|Haltung gezeigt/i);
});

test("english April 9 message does not repeat the date", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-04-09",
    }),
    "en",
  );

  assert.doesNotMatch(message, /April 9/i);
  assert.match(message, /resistance under Nazi rule|held their ground/i);
});

test("monthly german personal lines can address the user by name", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-04-05",
      name: "Daniel",
      latestWaistCm: null,
      latestWeightKg: null,
      documentedDays: 0,
      outstandingDebtCents: 0,
      motivation: "Dranbleiben.",
    }),
    "de",
  );

  assert.match(message, /Daniel,/);
});

test("monthly english personal lines can address the user by name", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-04-05",
      name: "Daniel",
      latestWaistCm: null,
      latestWeightKg: null,
      documentedDays: 0,
      outstandingDebtCents: 0,
      motivation: "Keep going.",
    }),
    "en",
  );

  assert.match(message, /Daniel,/);
});

test("higher bodyweight profile gets a lean-oriented german line", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-07-24",
      latestWeightKg: 95,
      latestWaistCm: null,
      documentedDays: 0,
      outstandingDebtCents: 0,
      motivation: null,
    }),
    "de",
  );

  assert.match(message, /Lean|weniger Ballast|Kalorienbeilage/);
});

test("lower bodyweight profile gets a bulk-oriented english line", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-07-24",
      latestWeightKg: 58,
      latestWaistCm: null,
      documentedDays: 0,
      outstandingDebtCents: 0,
      motivation: null,
    }),
    "en",
  );

  assert.match(message, /bulk|protein|bulking energy/i);
});

test("birthday message still overrides fact generation", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-04-02",
      birthDate: new Date("1990-04-02T12:00:00Z"),
    }),
    "de",
  );

  assert.match(message, /heute ist Geburtstag/i);
  assert.doesNotMatch(message, /Im Kalender steht heute|Für heute bleibt hängen|Die Datumsnotiz/i);
});

test("fallback message still works for unknown dates", () => {
  const message = getDailyMessage(
    buildContext({
      currentDate: "2026-13-40",
    }),
    "de",
  );

  assert.match(message, /Heute zählt vor allem|ruhiger|sauberer Tag|Konsequenz/i);
});
