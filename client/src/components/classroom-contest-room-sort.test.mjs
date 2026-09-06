import assert from "node:assert/strict";
import test from "node:test";

import { ROOM_SORT, sortContestRooms } from "./classroom-contest-room-sort.mjs";

const rooms = [
  { id: "room-z", name: "zeta", contests: [{}, {}] },
  { id: "room-b", name: "Alpha", contests: [{}] },
  { id: "room-a", name: "alpha", contests: [{}, {}, {}] },
  { id: "room-m", name: "Middle", contests: [] },
];

test("room sorting defaults to deterministic case-insensitive name order without mutating input", () => {
  const originalOrder = rooms.map((room) => room.id);

  assert.deepEqual(sortContestRooms(rooms).map((room) => room.id), ["room-b", "room-a", "room-m", "room-z"]);
  assert.deepEqual(rooms.map((room) => room.id), originalOrder);
});

test("room sorting supports descending names and contest-count options with name tie-breaks", () => {
  assert.deepEqual(sortContestRooms(rooms, ROOM_SORT.NAME_DESC).map((room) => room.id), ["room-z", "room-m", "room-a", "room-b"]);
  assert.deepEqual(sortContestRooms(rooms, ROOM_SORT.MOST_CONTESTS).map((room) => room.id), ["room-a", "room-z", "room-b", "room-m"]);
  assert.deepEqual(sortContestRooms(rooms, ROOM_SORT.FEWEST_CONTESTS).map((room) => room.id), ["room-m", "room-b", "room-z", "room-a"]);
});
