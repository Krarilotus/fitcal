import test from "node:test";
import assert from "node:assert/strict";
import { getBrowserVideoCompressionSupportError } from "@/lib/video-processing/browser/video-compression-support";

test("browser compression requires a secure context", () => {
  assert.equal(
    getBrowserVideoCompressionSupportError({
      hasVideoDecoder: true,
      hasVideoEncoder: true,
      isSecureContext: false,
    }),
    "Lokale Videokompression braucht einen sicheren Ursprung (HTTPS oder localhost).",
  );
});

test("browser compression requires webcodecs encode and decode support", () => {
  assert.equal(
    getBrowserVideoCompressionSupportError({
      hasVideoDecoder: false,
      hasVideoEncoder: true,
      isSecureContext: true,
    }),
    "Dieser Browser unterstuetzt keine hardwarebeschleunigte lokale Videokompression.",
  );
});

test("browser compression support passes when all requirements are available", () => {
  assert.equal(
    getBrowserVideoCompressionSupportError({
      hasVideoDecoder: true,
      hasVideoEncoder: true,
      isSecureContext: true,
    }),
    null,
  );
});
