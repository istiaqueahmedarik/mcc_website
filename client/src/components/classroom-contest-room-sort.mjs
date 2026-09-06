export const ROOM_SORT = Object.freeze({
  NAME_ASC: "name-asc",
  NAME_DESC: "name-desc",
  MOST_CONTESTS: "most-contests",
  FEWEST_CONTESTS: "fewest-contests",
});

export const ROOM_SORT_OPTIONS = Object.freeze([
  { value: ROOM_SORT.NAME_ASC, label: "Name A–Z" },
  { value: ROOM_SORT.NAME_DESC, label: "Name Z–A" },
  { value: ROOM_SORT.MOST_CONTESTS, label: "Most contests" },
  { value: ROOM_SORT.FEWEST_CONTESTS, label: "Fewest contests" },
]);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareRoomIdentity(left, right) {
  const leftName = String(left?.name || "");
  const rightName = String(right?.name || "");
  return compareText(leftName.toLowerCase(), rightName.toLowerCase())
    || compareText(leftName, rightName)
    || compareText(String(left?.id || ""), String(right?.id || ""));
}

function contestCount(room) {
  return Array.isArray(room?.contests) ? room.contests.length : 0;
}

export function sortContestRooms(rooms = [], sortBy = ROOM_SORT.NAME_ASC) {
  return rooms
    .map((room, index) => ({ room, index }))
    .sort((left, right) => {
      let result = 0;

      if (sortBy === ROOM_SORT.NAME_DESC) {
        result = -compareRoomIdentity(left.room, right.room);
      } else if (sortBy === ROOM_SORT.MOST_CONTESTS) {
        result = contestCount(right.room) - contestCount(left.room)
          || compareRoomIdentity(left.room, right.room);
      } else if (sortBy === ROOM_SORT.FEWEST_CONTESTS) {
        result = contestCount(left.room) - contestCount(right.room)
          || compareRoomIdentity(left.room, right.room);
      } else {
        result = compareRoomIdentity(left.room, right.room);
      }

      return result || left.index - right.index;
    })
    .map(({ room }) => room);
}
