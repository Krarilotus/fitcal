import test from "node:test";
import assert from "node:assert/strict";
import type { CurrentUser } from "@/lib/auth/session";
import { submitSickness } from "@/application/challenge/submit-sickness";

test("sickness use case is available in Light mode", async () => {
  const result = await submitSickness({
    user: { id: "light", isLightParticipant: true } as unknown as CurrentUser,
    startDate: "not-a-date",
    endDate: "not-a-date",
    consent: true,
    notes: "",
    defaultNotes: "Sick",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "INVALID_RANGE");
});
