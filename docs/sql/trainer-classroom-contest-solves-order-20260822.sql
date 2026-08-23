-- Trainer classroom contest manual solves and contest serial ordering.
-- Task: trainer-classroom-contest-solves-order-20260822
-- Apply before deploying the matching server/client code.
--
-- This migration is additive, keeps access server-owned through Hono routes,
-- and preserves RLS on public-schema feature tables.

begin;

alter table public.classroom_contests
  add column if not exists sort_order integer;

with ordered as (
  select
    id,
    (row_number() over (partition by room_id order by created_at asc, id asc) - 1)::integer as next_sort_order
  from public.classroom_contests
)
update public.classroom_contests contest
set sort_order = ordered.next_sort_order
from ordered
where contest.id = ordered.id
  and contest.sort_order is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_contests_sort_order_check'
      and conrelid = 'public.classroom_contests'::regclass
  ) then
    alter table public.classroom_contests
      add constraint classroom_contests_sort_order_check
      check (sort_order is null or sort_order >= 0);
  end if;
end $$;

create index if not exists classroom_contests_room_sort_idx
  on public.classroom_contests (classroom_id, room_id, sort_order, created_at, id);

create table if not exists public.classroom_contest_solve_overrides (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  contest_id uuid not null references public.classroom_contests(id) on delete cascade,
  target_type text not null,
  student_id uuid null references public.users(id) on delete cascade,
  group_id uuid null references public.trainer_teams(id) on delete cascade,
  solve_count integer not null,
  note text null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_solve_overrides_target_type_check
    check (target_type in ('student', 'group')),
  constraint classroom_contest_solve_overrides_target_check
    check (
      (target_type = 'student' and student_id is not null and group_id is null)
      or
      (target_type = 'group' and group_id is not null and student_id is null)
    ),
  constraint classroom_contest_solve_overrides_solve_count_check
    check (solve_count >= 0)
);

create unique index if not exists classroom_contest_solve_overrides_student_uidx
  on public.classroom_contest_solve_overrides (room_id, contest_id, student_id)
  where student_id is not null;

create unique index if not exists classroom_contest_solve_overrides_group_uidx
  on public.classroom_contest_solve_overrides (room_id, contest_id, group_id)
  where group_id is not null;

create index if not exists classroom_contest_solve_overrides_room_idx
  on public.classroom_contest_solve_overrides (classroom_id, room_id, contest_id);

create index if not exists classroom_contest_solve_overrides_student_idx
  on public.classroom_contest_solve_overrides (student_id)
  where student_id is not null;

create index if not exists classroom_contest_solve_overrides_group_idx
  on public.classroom_contest_solve_overrides (group_id)
  where group_id is not null;

alter table public.classroom_contests enable row level security;
alter table public.classroom_contest_solve_overrides enable row level security;

commit;

-- Verification:
--
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'classroom_contests'
--   and column_name = 'sort_order';
--
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid in (
--   'public.classroom_contests'::regclass,
--   'public.classroom_contest_solve_overrides'::regclass
-- )
-- order by conname;
--
-- select indexname
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename in ('classroom_contests', 'classroom_contest_solve_overrides')
-- order by tablename, indexname;
--
-- select relname, relrowsecurity
-- from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relname in ('classroom_contests', 'classroom_contest_solve_overrides')
-- order by relname;
