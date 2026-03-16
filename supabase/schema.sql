-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks Table
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  priority text check (priority in ('High', 'Medium', 'Low')) default 'Medium',
  estimated_minutes integer,
  pomodoro_enabled boolean default false,
  pomodoro_length integer default 25,
  keep_until_done boolean default false,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Focus Sessions
create table public.focus_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration integer -- in seconds
);

-- Buckets Table (user's saved daily routines/micro-task lists)
create table public.buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null
);

-- Bucket Items Table
create table public.bucket_items (
  id uuid primary key default uuid_generate_v4(),
  bucket_id uuid references public.buckets(id) on delete cascade not null,
  title text not null,
  emoji text,
  order_index integer default 0
);

-- RLS Settings
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.buckets enable row level security;
alter table public.bucket_items enable row level security;

-- In a more robust setup we would use Supabase Auth for RLS policies,
-- Since auth is handled via custom frontend logic with stored tokens (dummy auth),
-- we will allow anon key access that filters based on the `user_id` column optionally,
-- but for ease of rapid client-side querying in this prototype, we'll allow all operations 
-- and handle filtering strictly in the Edge/Client queries with `eq('user_id', myUserId)`.

-- For true RLS with custom tokens without true Supabase Auth, you usually use a secure RPC or JWT.
-- For this prototype, we will allow wide access to anon, and trust client filtering, OR we setup RLS policies.
-- We will just do wide access for the prototype:
create policy "Allow all operations for anon" on public.users for all using (true) with check (true);
create policy "Allow all operations for anon" on public.tasks for all using (true) with check (true);
create policy "Allow all operations for anon" on public.focus_sessions for all using (true) with check (true);
create policy "Allow all operations for anon" on public.buckets for all using (true) with check (true);
create policy "Allow all operations for anon" on public.bucket_items for all using (true) with check (true);
