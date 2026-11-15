begin;

alter table public.users
  add column if not exists account_review_origin text not null default 'signup';

alter table public.users drop constraint if exists users_account_review_origin_check;
alter table public.users add constraint users_account_review_origin_check
  check (account_review_origin in ('signup', 'profile_change'));

create table if not exists public.global_form_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  kind text not null check (kind in ('tfc', 'general')),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  agreement_text text not null default '',
  built_in boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists global_form_templates_builtin_kind_uidx
  on public.global_form_templates(kind) where built_in;

create table if not exists public.global_form_campaigns (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.global_form_templates(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  status text not null default 'draft' check (status in ('draft', 'open', 'ended')),
  kind text not null check (kind in ('tfc', 'general')),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  agreement_text text not null default '',
  revision bigint not null default 0 check (revision >= 0),
  created_by uuid references public.users(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists global_form_campaigns_status_created_idx
  on public.global_form_campaigns(status, created_at desc);

create table if not exists public.global_form_responses (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null default gen_random_uuid() unique,
  campaign_id uuid not null references public.global_form_campaigns(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  campaign_revision bigint not null,
  campaign_snapshot jsonb not null check (jsonb_typeof(campaign_snapshot) = 'object'),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  profile_values jsonb not null default '{}'::jsonb check (jsonb_typeof(profile_values) = 'object'),
  agreement boolean not null check (agreement),
  submitted_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists global_form_responses_campaign_submitted_idx
  on public.global_form_responses(campaign_id, submitted_at desc);
create index if not exists global_form_responses_user_idx
  on public.global_form_responses(user_id, submitted_at desc);

create table if not exists public.global_form_presence (
  campaign_id uuid not null references public.global_form_campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  session_id text not null check (char_length(session_id) between 1 and 120),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  primary key (campaign_id, user_id, session_id)
);

create index if not exists global_form_presence_active_idx
  on public.global_form_presence(campaign_id, last_seen_at desc) where active;

create table if not exists public.global_form_profile_reviews (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.global_form_responses(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  prior_values jsonb not null default '{}'::jsonb check (jsonb_typeof(prior_values) = 'object'),
  proposed_values jsonb not null default '{}'::jsonb check (jsonb_typeof(proposed_values) = 'object'),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists global_form_profile_reviews_pending_user_uidx
  on public.global_form_profile_reviews(user_id) where status = 'pending';

create or replace function public.bump_global_form_campaign_revision()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.global_form_campaigns
  set revision = revision + 1, updated_at = now()
  where id = new.campaign_id;
  return new;
end;
$$;

drop trigger if exists global_form_response_revision_trigger on public.global_form_responses;
create trigger global_form_response_revision_trigger
after insert on public.global_form_responses
for each row execute function public.bump_global_form_campaign_revision();

create or replace function public.reject_global_form_response_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Global form responses are immutable' using errcode = '55000';
end;
$$;

drop trigger if exists global_form_response_immutable_trigger on public.global_form_responses;
create trigger global_form_response_immutable_trigger
before update or delete on public.global_form_responses
for each row execute function public.reject_global_form_response_mutation();

alter table public.global_form_templates enable row level security;
alter table public.global_form_campaigns enable row level security;
alter table public.global_form_responses enable row level security;
alter table public.global_form_presence enable row level security;
alter table public.global_form_profile_reviews enable row level security;

revoke all on public.global_form_templates from public, anon, authenticated;
revoke all on public.global_form_campaigns from public, anon, authenticated;
revoke all on public.global_form_responses from public, anon, authenticated;
revoke all on public.global_form_presence from public, anon, authenticated;
revoke all on public.global_form_profile_reviews from public, anon, authenticated;
revoke execute on function public.bump_global_form_campaign_revision() from public, anon, authenticated;
revoke execute on function public.reject_global_form_response_mutation() from public, anon, authenticated;

insert into public.global_form_templates (title, description, kind, fields, agreement_text, built_in)
values
  (
    'TFC Registration',
    'Collect the required student profile details for TFC registration.',
    'tfc',
    '[{"id":"mist_id","label":"MIST Student ID","type":"text","required":true,"mapUserField":"mist_id","options":[],"helpText":"Exactly nine digits"},{"id":"full_name","label":"Full name","type":"text","required":true,"mapUserField":"full_name","options":[],"helpText":"Use your official name"},{"id":"cf_id","label":"Codeforces handle","type":"text","required":true,"mapUserField":"cf_id","options":[],"helpText":"Saved handles remain pending until verified"},{"id":"vjudge_id","label":"VJudge username","type":"text","required":true,"mapUserField":"vjudge_id","options":[],"helpText":"Saved usernames remain pending until verified"}]'::jsonb,
    'I confirm that the registration details shown above are accurate.',
    true
  ),
  (
    'General',
    'A general-purpose registration form with configurable questions.',
    'general',
    '[]'::jsonb,
    'I confirm that the information provided is accurate.',
    true
  )
on conflict (kind) where built_in do nothing;

commit;
