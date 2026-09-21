-- ============================================================
-- Intersections — cloud sync schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query)
-- ============================================================

-- One row per completed daily puzzle per player.
-- This is the source of truth; player_stats is derived from it.
create table if not exists public.player_history (
    user_id        uuid        not null references auth.users(id) on delete cascade,
    puzzle_date    date        not null,
    solved         boolean     not null,
    guesses        smallint    not null check (guesses between 0 and 5),
    time_seconds   integer     not null check (time_seconds >= 0),
    guess_words    jsonb       not null default '[]'::jsonb,
    used_directions boolean    not null default false,   -- revealed the road sign (v2.1)
    is_archive     boolean     not null default false,   -- played from the Archive, not as the daily (v2.2)
    updated_at     timestamptz not null default now(),
    primary key (user_id, puzzle_date)
);

-- Upgrades for tables created before v2.1 / v2.2 (safe to run on a fresh table too)
alter table public.player_history
    add column if not exists used_directions boolean not null default false;
alter table public.player_history
    add column if not exists is_archive boolean not null default false;

-- Denormalised aggregate so leaderboards later are a plain SELECT,
-- not a compute-over-history. Always rewritten from history on sync.
create table if not exists public.player_stats (
    user_id             uuid        primary key references auth.users(id) on delete cascade,
    games_played        integer     not null default 0,
    wins                integer     not null default 0,
    losses              integer     not null default 0,
    current_streak      integer     not null default 0,
    best_streak         integer     not null default 0,
    best_time_seconds   integer,
    guess_distribution  jsonb       not null default '{"2":0,"3":0,"4":0,"5":0}'::jsonb,
    updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row Level Security: a player can only ever see or touch their own rows.
-- The browser uses the public "anon" key; these policies are the real wall.
-- ------------------------------------------------------------
alter table public.player_history enable row level security;
alter table public.player_stats   enable row level security;

drop policy if exists "own history" on public.player_history;
create policy "own history" on public.player_history
    for all
    using      (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "own stats" on public.player_stats;
create policy "own stats" on public.player_stats
    for all
    using      (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Helpful index for "all my history, newest first"
create index if not exists player_history_user_date_idx
    on public.player_history (user_id, puzzle_date desc);
