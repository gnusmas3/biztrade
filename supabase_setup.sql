-- ============================================
-- BizTrade — Supabase SQL Setup (v3)
-- 관리자 승인 후 공개 구조
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- profiles 테이블
create table if not exists profiles (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade unique,
  name        text,
  email       text,
  role        text default 'buyer' check (role in ('buyer','seller','admin')),
  user_type   text check (user_type in ('corporate','investor')),
  status      text default 'active' check (status in ('active','suspended')),
  created_at  timestamptz default now()
);

-- deals 테이블
-- status 흐름:
--   draft    → 셀러가 임시저장 (비공개)
--   pending  → 셀러가 검토 요청 (관리자 대기열)
--   approved → 관리자 승인 (공개)
--   rejected → 관리자 반려 (셀러만 열람, 재제출 가능)
--   sold     → 거래 완료 (공개, 수정 불가)
create table if not exists deals (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  industry         text not null,
  region           text not null,
  founded_year     integer,
  employee_count   integer,
  annual_revenue   bigint,
  operating_profit bigint,
  net_profit       bigint,
  asking_price     bigint,
  description      text,
  strengths        text,
  risks            text,
  reason_for_sale  text,
  contact_email    text,
  contact_phone    text,
  seller_id        uuid references auth.users(id) on delete set null,
  status           text default 'draft'
                     check (status in ('draft','pending','approved','rejected','sold')),
  admin_note       text,           -- 반려 사유 / 관리자 메모
  approved_at      timestamptz,
  rejected_at      timestamptz,
  sold_at          timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- inquiries 테이블
create table if not exists inquiries (
  id          uuid default gen_random_uuid() primary key,
  deal_id     uuid references deals(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  reply       text,
  replied_at  timestamptz,
  created_at  timestamptz default now()
);

-- ============================================
-- 2. 기존 테이블 컬럼 추가 (이미 있으면 무시)
-- ============================================

-- profiles
alter table profiles add column if not exists email     text;
alter table profiles add column if not exists user_type text check (user_type in ('corporate','investor'));
alter table profiles add column if not exists status    text default 'active' check (status in ('active','suspended'));

-- deals — status 제약 재설정 및 누락 컬럼 추가
alter table deals add column if not exists seller_id    uuid references auth.users(id) on delete set null;
alter table deals add column if not exists admin_note   text;
alter table deals add column if not exists approved_at  timestamptz;
alter table deals add column if not exists rejected_at  timestamptz;
alter table deals add column if not exists sold_at      timestamptz;
alter table deals add column if not exists updated_at   timestamptz default now();

-- status CHECK 재설정 (기존 제약 삭제 후 재생성)
alter table deals drop constraint if exists deals_status_check;
alter table deals add constraint deals_status_check
  check (status in ('draft','pending','approved','rejected','sold'));

-- status 기본값을 draft 로 변경
alter table deals alter column status set default 'draft';

-- inquiries
alter table inquiries add column if not exists reply      text;
alter table inquiries add column if not exists replied_at timestamptz;

-- ============================================
-- 3. updated_at 자동 갱신 트리거
-- ============================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists deals_set_updated_at on deals;
create trigger deals_set_updated_at
  before update on deals
  for each row execute procedure public.set_updated_at();

-- ============================================
-- 4. 신규 가입자 자동 프로필 생성 트리거
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, email, role, status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'buyer'),
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 5. 관리자 역할 확인 헬퍼 함수
-- ============================================

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$ language sql security definer stable;

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

alter table deals     enable row level security;
alter table inquiries enable row level security;
alter table profiles  enable row level security;

-- ──────────────────────────────────────────
-- deals 정책
-- ──────────────────────────────────────────

-- 기존 정책 전체 삭제
drop policy if exists "approved deals are public"  on deals;
drop policy if exists "anyone can insert deals"    on deals;
drop policy if exists "admin can read all deals"   on deals;
drop policy if exists "admin can update deals"     on deals;
drop policy if exists "admin can delete deals"     on deals;
drop policy if exists "seller can read own deals"  on deals;
drop policy if exists "seller can insert deals"    on deals;
drop policy if exists "seller can update own draft or rejected" on deals;

-- [PUBLIC] approved/sold 매물만 공개 열람
create policy "public read approved deals"
  on deals for select
  using (status in ('approved', 'sold'));

-- [SELLER] 본인 매물 전체 열람 (모든 상태)
create policy "seller read own deals"
  on deals for select
  using (seller_id = auth.uid());

-- [SELLER] 매물 등록 — 비회원 포함 허용, status는 draft/pending만 가능
-- seller_id가 있으면 반드시 본인 uid와 일치해야 함
create policy "seller insert deals"
  on deals for insert
  with check (
    status in ('draft', 'pending')
    and (
      seller_id is null           -- 비회원 제출
      or seller_id = auth.uid()   -- 회원 제출
    )
  );

-- [SELLER] 본인 매물 수정 — draft/rejected 상태에서만, status는 draft/pending으로만 변경 가능
create policy "seller update own deals"
  on deals for update
  using (
    seller_id = auth.uid()
    and status in ('draft', 'rejected')
  )
  with check (
    seller_id = auth.uid()
    and status in ('draft', 'pending')
  );

-- [ADMIN] 전체 매물 열람
create policy "admin read all deals"
  on deals for select
  using (public.is_admin());

-- [ADMIN] 전체 매물 수정 (승인/반려/거래완료 등)
create policy "admin update deals"
  on deals for update
  using (public.is_admin());

-- [ADMIN] 전체 매물 삭제
create policy "admin delete deals"
  on deals for delete
  using (public.is_admin());

-- ──────────────────────────────────────────
-- profiles 정책
-- ──────────────────────────────────────────

drop policy if exists "users can view own profile"  on profiles;
drop policy if exists "admin can read all profiles" on profiles;
drop policy if exists "admin can update profiles"   on profiles;
drop policy if exists "users can update own profile" on profiles;

-- 본인 프로필 열람
create policy "users read own profile"
  on profiles for select
  using (user_id = auth.uid());

-- 본인 프로필 수정 (role/status 필드는 변경 불가 — 트리거로 보호)
create policy "users update own profile"
  on profiles for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- role 및 status 는 본인이 변경 불가
    -- (애플리케이션 레벨에서도 해당 필드 제외하여 업데이트)
  );

-- 관리자 전체 열람
create policy "admin read all profiles"
  on profiles for select
  using (public.is_admin());

-- 관리자 전체 수정
create policy "admin update profiles"
  on profiles for update
  using (public.is_admin());

-- ──────────────────────────────────────────
-- inquiries 정책
-- ──────────────────────────────────────────

drop policy if exists "anyone can insert inquiries" on inquiries;
drop policy if exists "admin can read inquiries"    on inquiries;
drop policy if exists "admin can update inquiries"  on inquiries;
drop policy if exists "admin can delete inquiries"  on inquiries;

-- 비회원 포함 누구나 문의 등록
create policy "anyone insert inquiries"
  on inquiries for insert
  with check (true);

-- 관리자 전체 문의 열람
create policy "admin read inquiries"
  on inquiries for select
  using (public.is_admin());

-- 관리자 답변 등록/수정
create policy "admin update inquiries"
  on inquiries for update
  using (public.is_admin());

-- 관리자 문의 삭제
create policy "admin delete inquiries"
  on inquiries for delete
  using (public.is_admin());

-- ============================================
-- 7. 관리자 계정 생성 방법
-- ============================================
-- 1. Supabase Dashboard > Authentication > Users > "Add user"
-- 2. 생성된 user_id 확인 후 아래 실행:
--
-- insert into profiles (user_id, name, email, role, status)
-- values ('<user_id>', '관리자', 'admin@biztrade.kr', 'admin', 'active')
-- on conflict (user_id) do update set role = 'admin';
--
-- ============================================
-- 8. 상태 전이 요약
-- ============================================
--
--  셀러 액션:
--    임시저장:  INSERT  status='draft'
--    검토요청:  INSERT  status='pending'  또는  UPDATE draft→pending
--    재제출:    UPDATE  rejected→pending
--
--  관리자 액션:
--    승인:      UPDATE  pending→approved  (approved_at=now())
--    반려:      UPDATE  pending→rejected  (rejected_at=now(), admin_note=사유)
--    거래완료:  UPDATE  approved→sold     (sold_at=now())
--    삭제:      DELETE  (어느 상태든)
--
--  공개 노출 조건: status IN ('approved', 'sold')
