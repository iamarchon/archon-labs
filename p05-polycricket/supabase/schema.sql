-- Enable UUID extension
create extension if not exists "pgcrypto";

-- USERS
create table users (
  id text primary key,
  username text not null,
  coins integer not null default 1000,
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
  status text not null default 'scheduled',
  winner text,
  created_at timestamptz default now()
);

-- MARKETS
create table markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  outcome text,
  yes_pool integer not null default 500,
  no_pool integer not null default 500,
  total_pool integer generated always as (yes_pool + no_pool) stored,
  market_type text not null default 'match_outcome',
  resolves_at timestamptz not null,
  created_at timestamptz default now()
);

-- BETS
create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  market_id uuid references markets(id) on delete cascade,
  side text not null,
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
  type text not null,
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

-- RPC: place_bet (atomic)
create or replace function place_bet(
  p_user_id text,
  p_market_id uuid,
  p_side text,
  p_coins integer
) returns json language plpgsql security definer as $$
declare
  v_market markets%rowtype;
  v_user_coins integer;
  v_price numeric;
  v_bet_id uuid;
begin
  select * into v_market from markets where id = p_market_id for update;
  if v_market.status != 'open' then raise exception 'Market is not open'; end if;

  select coins into v_user_coins from users where id = p_user_id for update;
  if v_user_coins < p_coins then raise exception 'Insufficient coins'; end if;

  if p_side = 'yes' then
    v_price := v_market.yes_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set yes_pool = yes_pool + p_coins where id = p_market_id;
  else
    v_price := v_market.no_pool::numeric / (v_market.yes_pool + v_market.no_pool);
    update markets set no_pool = no_pool + p_coins where id = p_market_id;
  end if;

  update users set coins = coins - p_coins where id = p_user_id;

  insert into bets (user_id, market_id, side, coins_wagered, price_at_bet)
  values (p_user_id, p_market_id, p_side, p_coins, v_price)
  returning id into v_bet_id;

  insert into coin_transactions (user_id, amount, type, ref_id)
  values (p_user_id, -p_coins, 'bet', v_bet_id);

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
  v_bet bets%rowtype;
  v_winning_pool integer;
  v_payout integer;
begin
  select * into v_market from markets where id = p_market_id for update;
  if v_market.status != 'open' then return; end if;

  if p_outcome = 'yes' then
    v_winning_pool := v_market.yes_pool;
  else
    v_winning_pool := v_market.no_pool;
  end if;

  for v_bet in select * from bets where market_id = p_market_id and side = p_outcome loop
    v_payout := floor((v_bet.coins_wagered::numeric / v_winning_pool) * (v_market.yes_pool + v_market.no_pool));
    update bets set payout = v_payout where id = v_bet.id;
    update users set coins = coins + v_payout where id = v_bet.user_id;
    insert into coin_transactions (user_id, amount, type, ref_id)
    values (v_bet.user_id, v_payout, 'payout', v_bet.id);
  end loop;

  update bets set payout = 0 where market_id = p_market_id and side != p_outcome and payout is null;
  update markets set status = 'resolved', outcome = p_outcome where id = p_market_id;
end;
$$;
