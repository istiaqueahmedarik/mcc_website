import sql from "../db";

// Caller supplies only IDs returned by the existing role/ownership-filtered list.
// Three batched reads avoid one network query per classroom and expose no roster PII.
export async function getTrainerDashboardSummaries(classroomIds: string[]) {
  if (!classroomIds.length) return new Map();
  const [overview, sessions, reports] = await Promise.all([
    sql`
      SELECT c.id,
        (SELECT count(*)::int FROM classroom_students cs
          JOIN users u ON u.id = cs.student_id
          WHERE cs.classroom_id = c.id AND cs.enrollment_status = 'active'
            AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE) AS student_count,
        (SELECT count(*)::int FROM classroom_students cs
          WHERE cs.classroom_id = c.id AND cs.enrollment_status = 'link_pending') AS pending_requests,
        (SELECT t.title FROM classroom_topics t WHERE t.classroom_id = c.id
          ORDER BY t.updated_at DESC, t.created_at DESC, t.id LIMIT 1) AS latest_topic
      FROM classrooms c WHERE c.id IN ${sql(classroomIds)}
    `,
    sql`
      SELECT DISTINCT ON (classroom_id, status)
        classroom_id, id, name, status, scheduled_time, started_at, duration_minutes
      FROM classes
      WHERE classroom_id IN ${sql(classroomIds)} AND status IN ('started', 'scheduled')
      ORDER BY classroom_id, status,
        CASE WHEN status = 'scheduled' AND scheduled_time >= now() THEN 0 ELSE 1 END,
        scheduled_time ASC NULLS LAST, id
    `,
    sql`
      SELECT r.classroom_id, r.room_id, room.name
      FROM classroom_contest_reports r
      JOIN classroom_contest_rooms room ON room.id = r.room_id AND room.classroom_id = r.classroom_id
      WHERE r.classroom_id IN ${sql(classroomIds)} AND r.is_stale = true
      ORDER BY r.updated_at DESC, r.room_id
    `,
  ]);
  return new Map(
    overview.map((row) => [
      row.id,
      {
        student_count: row.student_count,
        pending_requests: row.pending_requests,
        latest_topic: row.latest_topic,
        active_session:
          sessions.find(
            (session) =>
              session.classroom_id === row.id && session.status === "started",
          ) || null,
        next_session:
          sessions.find(
            (session) =>
              session.classroom_id === row.id && session.status === "scheduled",
          ) || null,
        stale_reports: reports
          .filter((report) => report.classroom_id === row.id)
          .map(({ room_id, name }) => ({ room_id, name })),
      },
    ]),
  );
}
