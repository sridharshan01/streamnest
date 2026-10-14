create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,24}$'), created_at timestamptz default now());
create table public.video_history(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
 source_url text not null, provider text not null, title text, thumbnail_url text, duration_seconds int, last_position_seconds int default 0,
 status text not null, can_play boolean default false, can_download boolean default false, accessed_at timestamptz default now(), last_watched_at timestamptz default now(), deleted_at timestamptz);
create table public.saved_videos(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
 source_url text not null, provider text not null, title text, collection text, created_at timestamptz default now(), deleted_at timestamptz, unique(user_id, source_url));
create index on public.video_history(user_id, last_watched_at desc);
create index on public.saved_videos(user_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.video_history enable row level security;
alter table public.saved_videos enable row level security;
create policy own_profile on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy own_history on public.video_history for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy own_saved on public.saved_videos for all using (user_id=auth.uid()) with check (user_id=auth.uid());
-- Purge trash after 30 days (schedule with pg_cron):
-- select cron.schedule('purge-trash','0 3 * * *',$$delete from public.video_history where deleted_at < now()-interval '30 days'$$);
-- Username login: resolve username->email server-side only, never via a public endpoint.
