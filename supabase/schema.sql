create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text unique not null,
  password text not null,
  age integer default 0,
  weight numeric default 0,
  height numeric default 0,
  goal text default 'Not specified',
  gender text default '',
  activity text default 'moderate',
  bmi numeric,
  bmi_label text default '-',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workouts (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  exercise text not null,
  type text not null,
  duration integer not null,
  intensity text default 'moderate',
  calories integer default 0,
  date date not null,
  created_at timestamptz default now()
);

create table if not exists meals (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  food text not null,
  type text not null,
  calories integer not null,
  carbs integer default 0,
  protein integer default 0,
  fat integer default 0,
  date date not null,
  created_at timestamptz default now()
);

create table if not exists goals (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  category text default 'Custom',
  current numeric not null,
  start numeric not null,
  target numeric not null,
  unit text default '',
  deadline date,
  created_at timestamptz default now()
);

alter table users enable row level security;
alter table workouts enable row level security;
alter table meals enable row level security;
alter table goals enable row level security;

-- The Express server uses SUPABASE_SERVICE_ROLE_KEY and owns authorization.
-- Do not expose that key in browser code.