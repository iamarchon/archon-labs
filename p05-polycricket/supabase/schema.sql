-- Enable UUID extension
create extension if not exists "pgcrypto";

-- USERS
create table users (
  id text primary key,
  username text not null,
  coins integer not null default 1000 check (coins >= 0),
  last_bonus_at timestamptz,
  created_at timestamptz default now()
);

-- MATCHES (worker-owned)
create table matches (
  id uuid primary key default gen_random_uuid(),
  cricapi_match_id text unique not null,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  winner text,
  created_at timestamptz default now()
);

-- MARKETS
create table markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'resolved', 'disputed')),
  outcome text,
  yes_pool integer not null default 500,
  no_pool integer not null default 500,
  total_pool integer generated always as (yes_pool + no_pool) stored,
  market_type text not null default 'match_outcome' check (market_type in ('match_outcome', 'tournament')),
  resolves_at timestamptz not null,
  created_at timestamptz default now()
);

-- BETS
create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  market_id uuid references markets(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  coins_wagered integer not null,
  price_at_bet numeric not null,
  payout integer,
  created_at timestamptz default now()
);

-- COIN TRANSACTIONS
create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('bet', 'payout', 'bonus', 'signup')),
  ref_id uuid,
  created_at timestamptz default now()
);

-- ORDER BOOK STUB (future CLOB)
create table order_book (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references markets(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  side text not null,
  order_type text not null,
  price numeric not null,
  shares numeric not null,
  status text not null default 'open',
  created_at timestamptz default now()
);

-- RLS
alter table users enable row level security;
alter table markets enable row level security;
alter table bets enable row level security;
alter table coin_transactions enable row level security;
alter table matches enable row level security;

create policy "public read users" on users for select using (true);
create policy "public read markets" on markets for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read bets" on bets for select using (true);
create policy "own coin_transactions" on coin_transactions for select using (auth.uid()::text = user_id);

-- Indexes
create index on bets (market_id, side);
create index on bets (user_id, created_at desc);
create index on coin_transactions (user_id, created_at desc);

-- RPC: place_bet (atomic)
create or replace function place_bet(
  p_market_id uuid,
  p_side text,
  p_coins integer,
  p_user_id text
) returns json language plpgsql security definer as $$
declare
  v_user_id text := p_user_id;
  v_market markets%rowtype;
  v_user_coins integer;
  v_price numeric;
  v_bet_id uuid;
begin
  if p_user_id is null or p_user_id = '' then raise exception 'User required'; end if;
  if p_side not in ('yes', 'no') then raise exception 'Invalid side'; end if;
  if p_coins <= 0 then raise exception 'Coins must be positive'; end if;

  select * into v_market from markets where id = p_market_id for update;
  if v_market.status != 'open' then raise exception 'Market is not open'; end if;

  select coins into v_user_coins from users where id = v_user_id for update;
  if v_user_coins < p_coins then raise exception 'Insufficient coins'; end if;

  if p_side = 'yes' then
    v_price := v_market.yes_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set yes_pool = yes_pool + p_coins where id = p_market_id;
  else
    v_price := v_market.no_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set no_pool = no_pool + p_coins where id = p_market_id;
  end if;

  update users set coins = coins - p_coins where id = v_user_id;

  insert into bets (user_id, market_id, side, coins_wagered, price_at_bet)
  values (v_user_id, p_market_id, p_side, p_coins, v_price)
  returning id into v_bet_id;

  insert into coin_transactions (user_id, amount, type, ref_id)
  values (v_user_id, -p_coins, 'bet', v_bet_id);

  return json_build_object('bet_id', v_bet_id, 'price_at_bet', v_price);
end;
$$;

-- RPC: resolve_market (atomic)
create or replace function resolve_market(
  p_market_id uuid,
  p_outcome text
) returns void language plpgsql security definer as $$
declare
  v_market markets%rowtype;
  v_winning_pool integer;
begin
  if p_outcome not in ('yes', 'no') then raise exception 'Invalid outcome'; end if;

  select * into v_market from markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status != 'open' then return; end if;

  if p_outcome = 'yes' then
    v_winning_pool := v_market.yes_pool;
  else
    v_winning_pool := v_market.no_pool;
  end if;

  -- Batch pay winners
  with winners as (
    select id, user_id, coins_wagered,
      floor((coins_wagered::numeric / v_winning_pool::numeric)
            * (v_market.yes_pool::numeric + v_market.no_pool::numeric))::integer as payout_amount
    from bets
    where market_id = p_market_id and side = p_outcome
  )
  update bets b set payout = w.payout_amount
  from winners w where b.id = w.id;

  -- Credit winners' coins
  with winners as (
    select user_id,
      floor((coins_wagered::numeric / v_winning_pool::numeric)
            * (v_market.yes_pool::numeric + v_market.no_pool::numeric))::integer as payout_amount
    from bets
    where market_id = p_market_id and side = p_outcome
  )
  update users u set coins = coins + w.payout_amount
  from winners w where u.id = w.user_id;

  -- Insert payout coin_transactions
  insert into coin_transactions (user_id, amount, type, ref_id)
  select b.user_id,
    floor((b.coins_wagered::numeric / v_winning_pool::numeric)
          * (v_market.yes_pool::numeric + v_market.no_pool::numeric))::integer,
    'payout',
    b.id
  from bets b
  where b.market_id = p_market_id and b.side = p_outcome;

  update bets set payout = 0 where market_id = p_market_id and side != p_outcome and payout is null;
  update markets set status = 'resolved', outcome = p_outcome where id = p_market_id;
end;
$$;

revoke execute on function resolve_market(uuid, text) from authenticated, anon;

-- RPC: claim_daily_bonus (atomic — prevents race condition double-claim)
create or replace function claim_daily_bonus(
  p_user_id text
) returns json language plpgsql security definer as $$
declare
  v_user users%rowtype;
begin
  select * into v_user from users where id = p_user_id for update;
  if not found then raise exception 'User not found'; end if;

  if v_user.last_bonus_at is not null and
     v_user.last_bonus_at > now() - interval '24 hours' then
    raise exception 'Already claimed';
  end if;

  update users set coins = coins + 100, last_bonus_at = now() where id = p_user_id;

  insert into coin_transactions (user_id, amount, type)
  values (p_user_id, 100, 'bonus');

  return json_build_object('coins', v_user.coins + 100);
end;
$$;
