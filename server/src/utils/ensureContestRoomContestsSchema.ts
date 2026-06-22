import sql from "../db";

let ensured = false;

export const ensureContestRoomContestsSchema = async () => {
  if (ensured) return;

  await sql`ALTER TABLE public."Contest_room_contests" DROP CONSTRAINT IF EXISTS "Contest_room_contests_contest_id_key"`;
  await sql`DROP INDEX IF EXISTS public."Contest_room_contests_contest_id_key"`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS contest_room_contests_room_id_contest_id_uidx ON public."Contest_room_contests" (room_id, contest_id)`;

  ensured = true;
};
