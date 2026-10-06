import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  roomStatus,
  sessionFor,
  visibleClassrooms,
  readPreferences,
} from "./dashboard-model.mjs";
const rooms = [
  {
    id: "a",
    name: "Alpha",
    is_owner: true,
    live_url: "https://example.com/meeting",
    dashboard: {},
  },
  {
    id: "b",
    name: "Beta",
    is_substitute: true,
    dashboard: {
      active_session: {
        status: "started",
        scheduled_time: "2026-09-05T12:00:00Z",
      },
    },
  },
  {
    id: "c",
    name: "Gamma",
    is_owner: true,
    is_substitute: true,
    dashboard: {
      latest_topic: "Binary search",
      next_session: {
        status: "scheduled",
        scheduled_time: "2026-09-06T12:00:00Z",
      },
    },
  },
];
describe("trainer dashboard behavior", () => {
  it("does not mistake a meeting link for a live session", () => {
    assert.equal(roomStatus(rooms[0]), "Meeting link available");
    assert.equal(roomStatus(rooms[1]), "Live now");
    assert.deepEqual(
      visibleClassrooms(rooms, { filter: "live" }).map((r) => r.id),
      ["b"],
    );
  });
  it("separates owned and co-training classrooms even with both flags", () => {
    assert.deepEqual(
      visibleClassrooms(rooms, { filter: "owned" }).map((r) => r.id),
      ["a", "c"],
    );
    assert.deepEqual(
      visibleClassrooms(rooms, { filter: "co-training" }).map((r) => r.id),
      ["b"],
    );
  });
  it("searches topics literally and never mutates the source list", () => {
    assert.equal(visibleClassrooms(rooms, { query: " BINARY " })[0].id, "c");
    assert.equal(visibleClassrooms(rooms, { query: "*" }).length, 0);
    visibleClassrooms(rooms, { sort: "session" });
    assert.equal(rooms[0].id, "a");
  });
  it("puts pinned rooms first, then recent rooms or actual sessions", () => {
    assert.deepEqual(
      visibleClassrooms(rooms, { pins: ["a"], recent: { b: 200, c: 100 } }).map(
        (r) => r.id,
      ),
      ["a", "b", "c"],
    );
    assert.deepEqual(
      visibleClassrooms(rooms, { sort: "session" }).map((r) => r.id),
      ["b", "c", "a"],
    );
    assert.equal(sessionFor(rooms[1]).status, "started");
  });
  it("recovers corrupt preferences and ignores invalid timestamps", () => {
    assert.deepEqual(readPreferences("{broken"), { pins: [], recent: {} });
    assert.deepEqual(
      readPreferences('{"pins":["a",3],"recent":{"a":10,"b":"bad","c":-1}}'),
      { pins: ["a"], recent: { a: 10 } },
    );
    assert.deepEqual(readPreferences("null"), { pins: [], recent: {} });
  });
});
