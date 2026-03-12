-- Challenge completions tracking
create table if not exists challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  challenge_id text not null,
  completed_at timestamptz default now(),
  xp_awarded integer,
  unique(user_id, challenge_id)
);
alter table challenge_completions disable row level security;
