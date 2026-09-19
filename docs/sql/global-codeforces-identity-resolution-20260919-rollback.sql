begin;

drop table if exists public.contest_report_codeforces_identity_mappings;

alter table public."Contest_room_contests"
  drop constraint if exists contest_room_contests_codeforces_group_identity_mode_check,
  drop constraint if exists contest_room_contests_codeforces_source_type_check,
  drop column if exists codeforces_group_identity_mode,
  drop column if exists codeforces_source_type;

commit;
