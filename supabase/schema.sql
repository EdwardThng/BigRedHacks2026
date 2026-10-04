-- Big Red Dex schema. Paste into Supabase → SQL Editor → Run.
-- Also enable Authentication → Sign In / Providers → "Allow anonymous sign-ins".

-- One row per player. Created automatically on first sign-in.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- The player's Dex: one row per creature caught, with where it happened.
create table if not exists public.catches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  creature_id text not null,
  caught_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  accuracy_m real,
  primary key (user_id, creature_id)
);

-- Where players have been: one row each time they walk into a creature's habitat.
create table if not exists public.visits (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  creature_id text not null,
  entered_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  accuracy_m real
);
create index if not exists visits_user_time on public.visits (user_id, entered_at desc);

-- Row level security: players can only see and write their own rows.
alter table public.profiles enable row level security;
alter table public.catches enable row level security;
alter table public.visits enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own catches" on public.catches;
create policy "own catches" on public.catches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own visits read" on public.visits;
create policy "own visits read" on public.visits
  for select using (auth.uid() = user_id);
drop policy if exists "own visits insert" on public.visits;
create policy "own visits insert" on public.visits
  for insert with check (auth.uid() = user_id);

-- Create the profile row whenever a new auth user appears (anonymous or not).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
