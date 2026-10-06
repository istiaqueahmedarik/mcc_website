export const CLASSROOM_UPDATE_PRIORITIES = [
  'time_exceeded',
  'student_solution_submitted',
  'student_needs_review',
  'problem_progress_changed',
  'thread_reply',
  'new_problem',
  'teacher_feedback',
  'solution_status_changed',
  'topic_or_resource_updated',
];

export const CLASSROOM_THREAD_REACTIONS = ['like', 'heart', 'insight', 'done'];

const prioritySet = new Set(CLASSROOM_UPDATE_PRIORITIES);
const reactionSet = new Set(CLASSROOM_THREAD_REACTIONS);

export function normalizeClassroomUpdatePriorities(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : [];
  const known = incoming
    .map((item) => String(item || '').trim())
    .filter((item) => prioritySet.has(item));
  const unique = [...new Set(known)];
  const missing = CLASSROOM_UPDATE_PRIORITIES.filter((item) => !unique.includes(item));
  return [...unique, ...missing];
}

export function isClassroomThreadReaction(value: unknown): value is string {
  return reactionSet.has(String(value || '').trim());
}

export async function ensureClassroomUpdatesSchema() {
  // Schema is deployed by docs/sql/trainer-student-thread-instant-realtime-20260802.sql.
  // Keep this compatibility function while callers are migrated away from runtime guards.
  return Promise.resolve();
}
