import test from "node:test";
import assert from "node:assert/strict";
import { applyJoker } from "@/application/challenge/apply-joker";
import type { CurrentUser } from "@/lib/auth/session";

test("joker use case rejects light mode before side effects", async () => {
  const result = await applyJoker({
    user: {
      id: "light-test",
      isLightParticipant: true,
      dailySubmissions: [],
    } as unknown as CurrentUser,
    challengeDate: "2026-04-20",
    notes: "Joker",
  });

  assert.deepEqual(result, {
    ok: false,
    error: { code: "JOKER_NOT_AVAILABLE", details: undefined },
  });
});
