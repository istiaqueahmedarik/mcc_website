import assert from "node:assert/strict";
import test from "node:test";
import { getSafeReturnPath } from "./safe-return-path.mjs";

test("allows only internal registration campaign paths", () => {
  assert.equal(getSafeReturnPath("/register/tfc-fall_2026"), "/register/tfc-fall_2026");
  assert.equal(getSafeReturnPath("  /register/general-1  "), "/register/general-1");
});

test("rejects external, protocol-relative, nested and malformed paths", () => {
  for (const value of [
    "https://example.com/register/x",
    "//example.com/register/x",
    "/register/x/extra",
    "/admin/forms",
    "/register/%2F%2Fevil.test",
    "javascript:alert(1)",
    "",
    null,
  ]) {
    assert.equal(getSafeReturnPath(value), "/");
  }
});
