-- ============================================
-- BizTrade — Supabase SQL Setup (v2)
-- ============================================

-- deals 테이블
create table if not exists deals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  industry text not null,
  region text not null,
  founded_year integer,
  employee_count integer,
  annual_revenue bigint,
  operating_profit bigint,
  net_profit bigint,
  asking_price bigint,
  description text,
  strengths text,
  risks text,
  reason_for_sale text,
  contact_email text,
  contact_phone text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

-- profiles 테이블
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  name text,
  email text,
  role text default 'buyer' check (role in ('buyer','seller','admin')),
  user_type text check (user_type in ('corporate','investor')),
  status text default 'active' check (status in ('active','suspended')),
  created_at timestamptz default now()
);

-- inquiries 테이블
create table if not exists inquiries (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  message text,
  reply text,
  replied_at timestamptz,
  created_at timestamptz default now()
);

-- 기존 테이블 컬럼 추가 (이미 있으면 무시)
alter table profiles add column if not exists email text;
alter table profiles add column if not exists user_type text check (user_type in ('corporate','investor'));
alter table profiles add column if not exists status text default 'active' check (status in ('active','suspended'));
alter table inquiries add column if not exists reply text;
alter table inquiries add column if not exists replied_at timestamptz;

-- ============================================
-- Row Level Security
-- ============================================

alter table deals enable row level security;
alter table inquiries enable row level security;
alter table profiles enable row level security;

drop policy if exists "approved deals are public" on deals;
create policy "approved deals are public" on deals for select using (status = 'approved');

drop policy if exists "anyone can insert deals" on deals;
create policy "anyone can insert deals" on deals for insert with check (true);

drop policy if exists "admin can read all deals" on deals;
create policy "admin can read all deals" on deals for select using (true);

drop policy if exists "admin can update deals" on deals;
create policy "admin can update deals" on deals for update using (true);

drop policy if exists "admin can delete deals" on deals;
create policy "admin can delete deals" on deals for delete using (true);

drop policy if exists "anyone can insert inquiries" on inquiries;
create policy "anyone can insert inquiries" on inquiries for insert with check (true);

drop policy if exists "admin can read inquiries" on inquiries;
create policy "admin can read inquiries" on inquiries for select using (true);

drop policy if exists "admin can update inquiries" on inquiries;
create policy "admin can update inquiries" on inquiries for update using (true);

drop policy if exists "users can view own profile" on profiles;
create policy "users can view own profile" on profiles for select using (auth.uid() = user_id);

drop policy if exists "admin can read all profiles" on profiles;
create policy "admin can read all profiles" on profiles for select using (true);

drop policy if exists "admin can update profiles" on profiles;
create policy "admin can update profiles" on profiles for update using (true);

-- 신규 가입자 자동 프로필 생성 Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, email, role, status)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, coalesce(new.raw_user_meta_data->>'role', 'buyer'), 'active');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 관리자 계정 생성 방법
-- ============================================
-- 1. Supabase Dashboard > Authentication > Users > "Add user"
-- 2. 생성된 user_id 확인 후 아래 실행:
--
-- insert into profiles (user_id, name, email, role, status)
-- values ('<user_id>', '관리자', 'admin@example.com', 'admin', 'active')
-- on conflict (user_id) do update set role = 'admin';
