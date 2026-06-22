import sql from "../db";

let ensured = false;

export const ensureContestRoomSchema = async () => {
  if (ensured) return;

  await sql`ALTER TABLE public."Contest_report_room" ADD COLUMN IF NOT EXISTS contest_type text NOT NULL DEFAULT 'TFC'`;
  await sql`ALTER TABLE public."Contest_report_room" ADD COLUMN IF NOT EXISTS tfc_room_id uuid NULL`;
  await sql`ALTER TABLE public."Contest_report_room" ADD COLUMN IF NOT EXISTS tfc_percentage numeric NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE public."Contest_report_room" ADD COLUMN IF NOT EXISTS tsc_percentage numeric NOT NULL DEFAULT 100`;

  ensured = true;
};
