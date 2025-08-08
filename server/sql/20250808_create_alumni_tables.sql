-- Migration: Create alumni related tables
-- Generated at 2025-08-08
-- Requires pgcrypto (for gen_random_uuid). In Supabase it's enabled by default.

create table if not exists public.alumni_batch (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  label text not null,
  motto text,
  slug text generated always as ('batch-' || year::text) stored,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alumni_member (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.alumni_batch(id) on delete cascade,
  full_name text not null,
  role text,
  current_position text,
  bio text,
  image_url text,
  linkedin_url text,
  github_url text,
  highlight boolean default false,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alumni_update (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.alumni_member(id) on delete set null,
  submitted_by uuid references auth.users(id),
  title text,
  content text,
  status text default 'pending', -- pending|approved|rejected
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);

-- Helper trigger for updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_ab_updated before update on public.alumni_batch
  for each row execute function public.set_updated_at();

create trigger trg_am_updated before update on public.alumni_member
  for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_alumni_batch_year on public.alumni_batch(year);
create index if not exists idx_alumni_batch_sort on public.alumni_batch(sort_order);
create index if not exists idx_alumni_member_batch on public.alumni_member(batch_id);
create index if not exists idx_alumni_member_highlight on public.alumni_member(highlight) where highlight;
create index if not exists idx_alumni_member_sort on public.alumni_member(sort_order);

-- RLS
alter table public.alumni_batch enable row level security;
alter table public.alumni_member enable row level security;
alter table public.alumni_update enable row level security;

-- Policies (idempotent DO blocks because CREATE POLICY lacks IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_batch' AND policyname='alumni_batch_public_read') THEN
    CREATE POLICY "alumni_batch_public_read" ON public.alumni_batch FOR SELECT USING ( true );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_member' AND policyname='alumni_member_public_read') THEN
    CREATE POLICY "alumni_member_public_read" ON public.alumni_member FOR SELECT USING ( is_active );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_batch' AND policyname='alumni_batch_admin_write') THEN
    CREATE POLICY "alumni_batch_admin_write" ON public.alumni_batch FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_member' AND policyname='alumni_member_admin_write') THEN
    CREATE POLICY "alumni_member_admin_write" ON public.alumni_member FOR ALL USING ( auth.role() = 'service_role' ) WITH CHECK ( auth.role() = 'service_role' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_update' AND policyname='alumni_update_submit') THEN
    CREATE POLICY "alumni_update_submit" ON public.alumni_update FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_update' AND policyname='alumni_update_read') THEN
    CREATE POLICY "alumni_update_read" ON public.alumni_update FOR SELECT USING ( status = 'approved' );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_update' AND policyname='alumni_update_moderate') THEN
    CREATE POLICY "alumni_update_moderate" ON public.alumni_update FOR UPDATE USING ( auth.role() = 'service_role' );
  END IF;
END $$;

-- Convenience view combining batches + members
create or replace view public.alumni_public as
select b.id as batch_id,
       b.year,
       b.label,
       b.motto,
       b.slug,
       b.sort_order,
       json_agg(
         json_build_object(
           'id', m.id,
           'name', m.full_name,
           'role', m.role,
           'current_position', m.current_position,
           'image_url', m.image_url,
           'highlight', m.highlight,
           'sort_order', m.sort_order
         ) order by m.sort_order, m.full_name
       ) filter (where m.id is not null) as members
from public.alumni_batch b
left join public.alumni_member m on m.batch_id = b.id and m.is_active
where b.is_active
group by b.id
order by b.year desc, b.sort_order;

-- Storage recommendation (manual): create bucket "alumni" (private) and serve via signed URLs or set public read.
supabase storage create-bucket alumni
