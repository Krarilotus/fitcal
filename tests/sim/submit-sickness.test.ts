import test from "node:test";
import assert from "node:assert/strict";
import type { CurrentUser } from "@/lib/auth/session";
import { submitSickness } from "@/application/challenge/submit-sickness";

test("sickness use case rejects Light mode before database effects", async () => {
  const result = await submitSickness({
    user: { id: "light", isLightParticipant: true } as unknown as CurrentUser,
    startDate: "2026-04-20",
    endDate: "2026-04-20",
    consent: true,
    notes: "",
    defaultNotes: "Sick",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "SICKNESS_NOT_AVAILABLE");
});
