import assert from "node:assert/strict";
import test from "node:test";

import { formatClassroomSessionTime, getNextScheduledClass } from "./trainer-interior-model.mjs";

test("session time formats a date, time, and timezone without invalid Intl options", () => {
  const formatted = formatClassroomSessionTime("2026-09-08T13:30:00Z", "en-US");
  assert.match(formatted, /Sep 8, 2026/);
  assert.match(formatted, /UTC|GMT/);
});

test("next scheduled class ignores past and active rows", () => {
  const next = getNextScheduledClass([
    { id: "past", status: "scheduled", scheduled_time: "2026-09-01T00:00:00Z" },
    { id: "active", status: "started", scheduled_time: "2026-09-06T00:00:00Z" },
    { id: "later", status: "scheduled", scheduled_time: "2026-09-08T00:00:00Z" },
    { id: "next", status: "scheduled", scheduled_time: "2026-09-07T00:00:00Z" },
  ], new Date("2026-09-05T00:00:00Z").getTime());
  assert.equal(next?.id, "next");
});
