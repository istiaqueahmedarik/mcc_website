export function formatClassroomSessionTime(value, locales = undefined) {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return new Intl.DateTimeFormat(locales, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function getNextScheduledClass(classes, now = Date.now()) {
  return [...(classes || [])]
    .filter((classItem) => {
      if (classItem?.status !== "scheduled") return false;
      const scheduledAt = new Date(classItem.scheduled_time).getTime();
      return Number.isFinite(scheduledAt) && scheduledAt >= now;
    })
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())[0] || null;
}
