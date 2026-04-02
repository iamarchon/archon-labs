create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  username text unique not null,
  coins integer default 10000,
  created_at timestamptz default now()
);

create table if not exists fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  fixture_id integer not null,
  team_name text not null,
  player_ids integer[] not null,
  captain_id integer not null,
  vc_id integer not null,
  created_at timestamptz default now()
);

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fixture_id integer not null,
  creator_id uuid references users(id),
  is_public boolean default false,
  prize_coins integer default 0,
  max_members integer default 100,
  created_at timestamptz default now()
);

create table if not exists league_members (
  league_id uuid references leagues(id),
  user_id uuid references users(id),
  fantasy_team_id uuid references fantasy_teams(id),
  primary key (league_id, user_id)
);

create table if not exists match_state (
  fixture_id integer primary key,
  home_score integer default 0,
  home_wickets integer default 0,
  away_score integer default 220,
  away_wickets integer default 4,
  current_over integer default 0,
  current_ball integer default 0,
  status text default 'upcoming',
  updated_at timestamptz default now()
);

create table if not exists player_match_stats (
  fixture_id integer not null,
  player_id integer not null,
  runs integer default 0,
  wickets integer default 0,
  fours integer default 0,
  sixes integer default 0,
  dots integer default 0,
  maidens integer default 0,
  primary key (fixture_id, player_id)
);

do $$
begin
  alter publication supabase_realtime add table match_state;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table player_match_stats;
exception
  when duplicate_object then null;
end $$;
