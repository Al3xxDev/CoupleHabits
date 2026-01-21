-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom enum types
CREATE TYPE public.gender_identity AS ENUM (
    'female',
    'male',
    'non_binary',
    'prefer_not_to_say',
    'other'
);

CREATE TYPE public.couple_status AS ENUM (
    'pending',
    'active'
);

CREATE TYPE public.goal_scope AS ENUM (
    'personal',
    'couple'
);

CREATE TYPE public.tracking_type AS ENUM (
    'boolean',
    'count'
);

CREATE TYPE public.progress_status AS ENUM (
    'completed',
    'missed',
    'partial'
);

-- Tables

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    display_name text,
    avatar_url text,
    date_of_birth date,
    gender public.gender_identity,
    locale text DEFAULT 'en'::text,
    timezone text,
    onboarding_completed boolean DEFAULT false,
    terms_accepted_at timestamptz,
    privacy_policy_accepted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
    ON public.users (email);

-- Couples table

CREATE TABLE public.couples (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_a_id uuid NOT NULL,
    user_b_id uuid,
    status public.couple_status NOT NULL,
    code text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz,
    CONSTRAINT couples_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS couples_code_key
    ON public.couples (code);

-- Goals table

CREATE TABLE public.goals (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    title text NOT NULL,
    description text,
    scope public.goal_scope NOT NULL,
    owner_user_id uuid,
    couple_id uuid,
    frequency text NOT NULL,
    tracking_type public.tracking_type NOT NULL,
    target_value integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    archived_at timestamptz,
    updated_at timestamptz,
    CONSTRAINT goals_pkey PRIMARY KEY (id)
);

-- Progress table

CREATE TABLE public.progress (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    goal_id uuid NOT NULL,
    date_key date NOT NULL,
    value integer NOT NULL,
    status public.progress_status NOT NULL,
    recorded_by_user_id uuid,
    recorded_at timestamptz DEFAULT now(),
    note text,
    updated_at timestamptz,
    CONSTRAINT progress_pkey PRIMARY KEY (id)
);

-- Verification codes table

CREATE TABLE public.verification_codes (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT verification_codes_pkey PRIMARY KEY (id)
);

-- Foreign key constraints

ALTER TABLE public.couples
    ADD CONSTRAINT couples_user_a_id_fkey
    FOREIGN KEY (user_a_id)
    REFERENCES public.users (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

ALTER TABLE public.couples
    ADD CONSTRAINT couples_user_b_id_fkey
    FOREIGN KEY (user_b_id)
    REFERENCES public.users (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

ALTER TABLE public.goals
    ADD CONSTRAINT goals_owner_user_id_fkey
    FOREIGN KEY (owner_user_id)
    REFERENCES public.users (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

ALTER TABLE public.goals
    ADD CONSTRAINT goals_couple_id_fkey
    FOREIGN KEY (couple_id)
    REFERENCES public.couples (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

ALTER TABLE public.progress
    ADD CONSTRAINT progress_goal_id_fkey
    FOREIGN KEY (goal_id)
    REFERENCES public.goals (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

ALTER TABLE public.progress
    ADD CONSTRAINT progress_recorded_by_user_id_fkey
    FOREIGN KEY (recorded_by_user_id)
    REFERENCES public.users (id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;

-- Indexes
-- (Unique indexes already declared above for users.email and couples.code)

CREATE INDEX IF NOT EXISTS idx_goals_owner_user_id
    ON public.goals (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_goals_couple_id
    ON public.goals (couple_id);

CREATE INDEX IF NOT EXISTS idx_progress_goal_id
    ON public.progress (goal_id);

CREATE INDEX IF NOT EXISTS idx_progress_date_key
    ON public.progress (date_key);

-- =========================
-- STORAGE (AVATARS)
-- =========================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow public access to avatars (unauthenticated uploads allowed for onboarding)
create policy "Allow public avatars access"
  on storage.objects
  for all
  using ( bucket_id = 'avatars' )
  with check ( bucket_id = 'avatars' );

-- Row-Level Security (RLS)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- DEVELOPMENT ONLY: Allow all access
CREATE POLICY "Allow all access (dev only)" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all access (dev only)" ON public.couples FOR ALL USING (true);
CREATE POLICY "Allow all access (dev only)" ON public.goals FOR ALL USING (true);
CREATE POLICY "Allow all access (dev only)" ON public.progress FOR ALL USING (true);
CREATE POLICY "Allow all access (dev only)" ON public.verification_codes FOR ALL USING (true);

ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.couples REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.progress REPLICA IDENTITY FULL;
ALTER TABLE public.verification_codes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_codes;
