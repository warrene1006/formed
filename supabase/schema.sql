create table if not exists public.strava_tokens (
  athlete_id bigint primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text,
  athlete jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id bigint primary key,
  athlete_id bigint not null,
  name text,
  type text,
  sport_type text,
  start_date timestamptz,
  distance_meters numeric,
  moving_time_seconds integer,
  elapsed_time_seconds integer,
  average_heartrate numeric,
  max_heartrate numeric,
  weighted_average_watts numeric,
  average_speed numeric,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists activities_athlete_start_idx
  on public.activities (athlete_id, start_date desc);

create table if not exists public.user_settings (
  athlete_id bigint primary key,
  calendar_token text not null,
  calendar_name text not null default 'Elias',
  weekday_start text not null default '05:30',
  weekday_done_by text not null default '07:00',
  weekend_start text not null default '05:45',
  weekend_done_by text not null default '07:30',
  publish_all_workouts boolean not null default true,
  coach_name text not null default 'Elias',
  app_name text not null default 'Formed',
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_webhook_events (
  id text primary key,
  object_type text,
  object_id bigint,
  aspect_type text,
  owner_id bigint,
  subscription_id bigint,
  event_time bigint,
  updates jsonb,
  raw jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_messages (
  id bigserial primary key,
  athlete_id bigint,
  coach_name text not null default 'Elias',
  role text not null,
  content text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_athlete_created_idx
  on public.coach_messages (athlete_id, created_at desc);

create table if not exists public.session_feedback (
  id bigserial primary key,
  athlete_id bigint,
  workout_date date,
  workout_title text,
  sport text,
  rpe integer,
  feeling text,
  notes text,
  coach_name text not null default 'Elias',
  coach_message text,
  adaptation jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_feedback_athlete_created_idx
  on public.session_feedback (athlete_id, created_at desc);
