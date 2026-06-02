-- ============================================
-- BizTrade — 인수문의 시스템 SQL (v1)
-- supabase_setup.sql 실행 후 이 파일 실행
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- 관심등록
create table if not exists deal_interests (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  deal_id    uuid references deals(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, deal_id)
);

-- 인수문의 거래방
-- 바이어와 딜을 1:1로 연결, 거래 상태 추적
-- status 흐름:
--   new           → 방 생성 (바이어가 문의 시작)
--   contacted     → 첫 메시지 발송 후 자동 전환
--   nda_signed    → NDA 서명 완료
--   due_diligence → 셀러/관리자가 실사 단계로 전환
--   negotiation   → 가격 협상 단계
--   closed        → 거래 완료 or 취소
create table if not exists deal_rooms (
  id            uuid default gen_random_uuid() primary key,
  deal_id       uuid references deals(id) on delete cascade not null,
  buyer_id      uuid references auth.users(id) on delete cascade not null,
  seller_id     uuid references auth.users(id) on delete set null,
  status        text default 'new'
                  check (status in ('new','contacted','nda_signed','due_diligence','negotiation','closed')),
  closed_reason text,
  nda_signed_at timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(deal_id, buyer_id)
);

-- NDA 서명 기록 (법적 증빙용)
create table if not exists nda_agreements (
  id           uuid default gen_random_uuid() primary key,
  room_id      uuid references deal_rooms(id) on delete cascade not null,
  buyer_id     uuid references auth.users(id) on delete cascade not null,
  full_name    text not null,
  company_name text,
  signed_at    timestamptz default now(),
  ip_address   text,
  unique(room_id, buyer_id)
);

-- 채팅 메시지
create table if not exists messages (
  id         uuid default gen_random_uuid() primary key,
  room_id    uuid references deal_rooms(id) on delete cascade not null,
  sender_id  uuid references auth.users(id) on delete cascade not null,
  content    text,
  created_at timestamptz default now()
);

-- 첨부파일 메타데이터 (실제 파일은 Storage에 저장)
create table if not exists message_attachments (
  id          uuid default gen_random_uuid() primary key,
  message_id  uuid references messages(id) on delete cascade,
  room_id     uuid references deal_rooms(id) on delete cascade not null,
  file_name   text not null,
  file_path   text not null,  -- storage path: {roomId}/{uuid}_{filename}
  file_size   bigint,
  mime_type   text,
  uploaded_by uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now()
);

-- ============================================
-- 2. Triggers
-- ============================================

drop trigger if exists deal_rooms_set_updated_at on deal_rooms;
create trigger deal_rooms_set_updated_at
  before update on deal_rooms
  for each row execute procedure public.set_updated_at();

-- ============================================
-- 3. 거래방 참여자 헬퍼 함수
-- ============================================

create or replace function public.is_room_participant(p_room_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.deal_rooms
    where id = p_room_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
  );
$$ language sql security definer stable;

-- ============================================
-- 4. Row Level Security
-- ============================================

alter table deal_interests      enable row level security;
alter table deal_rooms          enable row level security;
alter table nda_agreements      enable row level security;
alter table messages            enable row level security;
alter table message_attachments enable row level security;

-- ── deal_interests ──────────────────────────

drop policy if exists "users manage own interests"  on deal_interests;
drop policy if exists "admin read all interests"    on deal_interests;

-- 본인 관심등록만 관리 (조회/추가/삭제)
create policy "users manage own interests"
  on deal_interests
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 관리자 전체 조회
create policy "admin read all interests"
  on deal_interests for select
  using (public.is_admin());

-- ── deal_rooms ───────────────────────────────

drop policy if exists "room participants read"   on deal_rooms;
drop policy if exists "buyer create room"        on deal_rooms;
drop policy if exists "participants update room" on deal_rooms;
drop policy if exists "admin delete room"        on deal_rooms;

-- 방 참여자 및 관리자만 조회
create policy "room participants read"
  on deal_rooms for select
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_admin()
  );

-- 인증된 바이어만 방 생성 (본인 buyer_id만 허용)
create policy "buyer create room"
  on deal_rooms for insert
  with check (buyer_id = auth.uid());

-- 참여자 또는 관리자만 상태 변경
create policy "participants update room"
  on deal_rooms for update
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_admin()
  );

-- 관리자만 삭제
create policy "admin delete room"
  on deal_rooms for delete
  using (public.is_admin());

-- ── nda_agreements ───────────────────────────

drop policy if exists "room participants read nda" on nda_agreements;
drop policy if exists "buyer sign nda"             on nda_agreements;

create policy "room participants read nda"
  on nda_agreements for select
  using (
    public.is_room_participant(room_id)
    or public.is_admin()
  );

-- 바이어 본인만 NDA 서명 (방 참여자여야 함)
create policy "buyer sign nda"
  on nda_agreements for insert
  with check (
    buyer_id = auth.uid()
    and public.is_room_participant(room_id)
  );

-- ── messages ─────────────────────────────────

drop policy if exists "room participants read messages" on messages;
drop policy if exists "room participants send messages" on messages;

create policy "room participants read messages"
  on messages for select
  using (
    public.is_room_participant(room_id)
    or public.is_admin()
  );

create policy "room participants send messages"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and (
      public.is_room_participant(room_id)
      or public.is_admin()
    )
  );

-- ── message_attachments ───────────────────────

drop policy if exists "room participants read attachments"   on message_attachments;
drop policy if exists "room participants upload attachments" on message_attachments;

create policy "room participants read attachments"
  on message_attachments for select
  using (
    public.is_room_participant(room_id)
    or public.is_admin()
  );

create policy "room participants upload attachments"
  on message_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_room_participant(room_id)
      or public.is_admin()
    )
  );

-- ============================================
-- 5. Supabase Realtime 활성화
-- ============================================
-- messages, deal_rooms 테이블의 실시간 변경 구독 활성화

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table deal_rooms;

-- ============================================
-- 6. Storage 버킷 생성 (첨부파일)
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-attachments',
  'deal-attachments',
  false,
  52428800,  -- 50MB
  null
)
on conflict (id) do nothing;

-- Storage RLS: 인증된 거래방 참여자만 업로드/다운로드
drop policy if exists "deal attachment upload" on storage.objects;
create policy "deal attachment upload"
  on storage.objects for insert
  with check (
    bucket_id = 'deal-attachments'
    and auth.uid() is not null
  );

drop policy if exists "deal attachment read" on storage.objects;
create policy "deal attachment read"
  on storage.objects for select
  using (
    bucket_id = 'deal-attachments'
    and auth.uid() is not null
  );

drop policy if exists "deal attachment delete" on storage.objects;
create policy "deal attachment delete"
  on storage.objects for delete
  using (
    bucket_id = 'deal-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or public.is_admin()
    )
  );

-- ============================================
-- 7. 상태 전이 요약
-- ============================================
--
--  new           → (바이어 최초 방문)
--  contacted     → 첫 메시지 발송 시 자동 전환
--  nda_signed    → NDA 서명 후 자동 전환
--  due_diligence → 셀러/관리자 수동 전환
--  negotiation   → 셀러/관리자 수동 전환
--  closed        → 셀러/관리자 수동 전환 (사유 입력)
--
--  공개 노출: deals.status = 'approved' 인 매물의 방만 생성 가능
