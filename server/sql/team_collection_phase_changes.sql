-- Team Collection Phase / Participation / Requests Migration
-- Run these statements (idempotent guards included) to upgrade schema.

-- 1. Add phase + timing columns to team_collections
ALTER TABLE public.team_collections
    ADD COLUMN IF NOT EXISTS phase integer NOT NULL DEFAULT 1;           -- 1 = participation, 2 = selection, 3 = finalized
ALTER TABLE public.team_collections
    ADD COLUMN IF NOT EXISTS phase1_deadline timestamptz;            -- deadline for participation window
ALTER TABLE public.team_collections
    ADD COLUMN IF NOT EXISTS phase2_started_at timestamptz;          -- timestamp when phase2 (selection) started
ALTER TABLE public.team_collections
    ADD COLUMN IF NOT EXISTS phase2_email_sent boolean NOT NULL DEFAULT false; -- notifications sent

-- 2. Participation table (per user per collection; default opt-out)
CREATE TABLE IF NOT EXISTS public.team_collection_participation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vjudge_id text,
    will_participate boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_collection_participation_user
    ON public.team_collection_participation (collection_id, user_id);

-- 3. Team request table for custom/manual team suggestions
CREATE TABLE IF NOT EXISTS public.team_collection_team_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    collection_id uuid NOT NULL REFERENCES public.team_collections(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vjudge_id text,
    proposed_team_title text,
    desired_member_vjudge_ids text[] NOT NULL DEFAULT '{}',
    note text,
    processed boolean NOT NULL DEFAULT false,
    processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_team_collection_team_requests_collection
    ON public.team_collection_team_requests (collection_id);

-- 4. Coach column safeguard (already conditionally added in code)
ALTER TABLE public.team_collection_teams
    ADD COLUMN IF NOT EXISTS coach_vjudge_id text;

-- End of migration
