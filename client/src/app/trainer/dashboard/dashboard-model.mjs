export const DASHBOARD_FILTERS = ["all", "owned", "co-training", "live"];
export const DASHBOARD_SORTS = ["recent", "name", "session"];

export function sessionFor(room) {
  return room.dashboard?.active_session || room.dashboard?.next_session || null;
}

export function roomStatus(room) {
  if (room.dashboard?.active_session?.status === "started") return "Live now";
  if (room.dashboard?.next_session?.status === "scheduled") return "Scheduled";
  return room.live_url ? "Meeting link available" : "No session scheduled";
}

export function visibleClassrooms(
  rooms,
  { query = "", filter = "all", sort = "recent", pins = [], recent = {} } = {},
) {
  const needle = query.trim().toLocaleLowerCase();
  const pinned = new Set(pins);
  const sessionTime = (room) => {
    const time = Date.parse(sessionFor(room)?.scheduled_time);
    return Number.isFinite(time) ? time : Infinity;
  };
  return rooms
    .filter((room) => {
      if (filter === "owned" && !room.is_owner) return false;
      if (filter === "co-training" && (!room.is_substitute || room.is_owner))
        return false;
      if (filter === "live" && roomStatus(room) !== "Live now") return false;
      return `${room.name || ""} ${room.trainer_name || ""} ${room.dashboard?.latest_topic || ""}`
        .toLocaleLowerCase()
        .includes(needle);
    })
    .sort((a, b) => {
      const pinOrder = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
      if (pinOrder) return pinOrder;
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "session") {
        const liveOrder =
          Number(roomStatus(b) === "Live now") -
          Number(roomStatus(a) === "Live now");
        if (liveOrder) return liveOrder;
        const timeOrder = sessionTime(a) - sessionTime(b);
        if (timeOrder && !Number.isNaN(timeOrder)) return timeOrder;
      }
      return (
        (recent[b.id] || 0) - (recent[a.id] || 0) ||
        (a.name || "").localeCompare(b.name || "")
      );
    });
}

export function readPreferences(raw) {
  try {
    const value = JSON.parse(raw || "{}");
    return {
      pins: Array.isArray(value.pins)
        ? value.pins.filter((id) => typeof id === "string").slice(0, 500)
        : [],
      recent: Object.fromEntries(
        Object.entries(value.recent || {})
          .filter(([id, time]) => id && Number.isFinite(time) && time >= 0)
          .slice(0, 500),
      ),
    };
  } catch {
    return { pins: [], recent: {} };
  }
}
