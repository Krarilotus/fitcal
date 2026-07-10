import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { PREVIEW_MODE_COOKIE } from "@/lib/preview-mode";

function previewRequest(path: string, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      cookie: `${PREVIEW_MODE_COOKIE}=light`,
    },
  });
}

test("light preview blocks mutation endpoints", () => {
  const response = proxy(previewRequest("/api/submissions"));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/dashboard?error=preview_read_only");
});

test("light preview allows logout, mode switching and reads", () => {
  assert.equal(proxy(previewRequest("/api/auth/logout")).status, 200);
  assert.equal(proxy(previewRequest("/api/preview-mode")).status, 200);
  assert.equal(proxy(previewRequest("/api/submissions/status", "GET")).status, 200);
});
