-- ============================================
-- BizTrade MVP — Supabase SQL Setup
-- ============================================

-- 1. deals 테이블
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

-- 2. inquiries 테이블
create table if not exists inquiries (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now()
);

-- 3. profiles 테이블
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  role text default 'buyer' check (role in ('buyer','seller','admin')),
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security
-- ============================================

alter table deals enable row level security;
alter table inquiries enable row level security;
alter table profiles enable row level security;

-- deals: approved인 것은 누구나 조회
create policy "approved deals are public"
  on deals for select
  using (status = 'approved');

-- deals: 누구나 등록 가능
create policy "anyone can insert deals"
  on deals for insert
  with check (true);

-- inquiries: 누구나 삽입 가능
create policy "anyone can insert inquiries"
  on inquiries for insert
  with check (true);

-- 관리자용 — 별도 service role key로 모든 조작 가능
-- (관리자 페이지에서는 서비스 롤 키 또는 RLS 우회 정책 추가 필요)
-- 아래 정책은 개발 중 임시로 모든 select 허용
create policy "admin can read all deals"
  on deals for select
  using (true);

create policy "admin can update deals"
  on deals for update
  using (true);

create policy "admin can delete deals"
  on deals for delete
  using (true);

create policy "admin can read inquiries"
  on inquiries for select
  using (true);

-- ============================================
-- 샘플 데이터
-- ============================================

insert into deals (
  title, industry, region, founded_year, employee_count,
  annual_revenue, operating_profit, net_profit, asking_price,
  description, strengths, risks, reason_for_sale, status
) values
(
  '성수동 디저트 카페', '카페/외식업', '서울 성동구', 2019, 5,
  850000000, 95000000, 72000000, 280000000,
  '성수동 대로변에 위치한 디저트 카페. 고정 고객층과 배달 매출 보유.',
  '유동인구 많은 대로변 위치, 충성 고객층 확보, 안정적인 배달 플랫폼 매출',
  '임대료 상승 리스크, 계절성 매출 변동 (여름 성수기/겨울 비수기)',
  '대표자 건강 문제로 인한 매각',
  'approved'
),
(
  '경기 북부 식품 제조업체', '제조업', '경기도 양주시', 2015, 12,
  2400000000, 210000000, 165000000, 750000000,
  '카페 원재료와 디저트 반제품을 제조하는 소규모 식품 제조업체.',
  'B2B 고정 거래처 보유, 자체 제조 설비 완비, 검증된 레시피 및 생산 노하우',
  '일부 설비 노후화, 주요 거래처 집중도 높음 (상위 3개사 매출 비중 65%)',
  '은퇴 계획에 따른 매각',
  'approved'
),
(
  '온라인 커피 원두 쇼핑몰', '온라인 쇼핑몰', '전국', 2020, 3,
  430000000, 48000000, 38000000, 120000000,
  '정기구독 고객을 보유한 원두 전문 온라인 쇼핑몰.',
  '정기구독 모델로 안정적 매출, 낮은 고정비 구조, 성장 중인 스페셜티 시장',
  '경쟁 심화 (대형 플랫폼 입점 증가), 원두 가격 변동성',
  '사업 방향 전환으로 인한 매각',
  'approved'
);
