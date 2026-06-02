-- ============================================
-- BizTrade — AI 매칭 시스템 SQL (v1)
-- supabase_setup.sql 실행 후 이 파일 실행
-- ============================================

-- ============================================
-- 1. pgvector 확장 활성화
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. deals 테이블에 임베딩 컬럼 추가
-- ============================================
ALTER TABLE deals ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 임베딩 생성 시각 추적
ALTER TABLE deals ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- ============================================
-- 3. 사용자 관심사 프로필
-- ============================================
CREATE TABLE IF NOT EXISTS user_interests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  industries  text[] DEFAULT '{}',      -- 관심 업종 (복수 선택)
  regions     text[] DEFAULT '{}',      -- 관심 지역 (복수 선택)
  min_price   bigint,                   -- 최소 희망 인수가 (원)
  max_price   bigint,                   -- 최대 희망 인수가 (원)
  min_ebitda  bigint,                   -- 최소 희망 EBITDA (원)
  max_ebitda  bigint,                   -- 최대 희망 EBITDA (원)
  notes       text,                     -- 기타 조건 (자유 텍스트)
  embedding   vector(1536),             -- 관심사 임베딩 벡터
  embedded_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================
-- 4. AI 매칭 결과
-- ============================================
CREATE TABLE IF NOT EXISTS deal_matches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id         uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  similarity_score float NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  is_notified     boolean DEFAULT false,  -- 알림 발송 여부
  is_read         boolean DEFAULT false,  -- 사용자 열람 여부
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- ============================================
-- 5. Triggers
-- ============================================

DROP TRIGGER IF EXISTS user_interests_set_updated_at ON user_interests;
CREATE TRIGGER user_interests_set_updated_at
  BEFORE UPDATE ON user_interests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS deal_matches_set_updated_at ON deal_matches;
CREATE TRIGGER deal_matches_set_updated_at
  BEFORE UPDATE ON deal_matches
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================
-- 6. pgvector 인덱스 (HNSW — 빠른 근사 최근접 탐색)
-- ============================================
CREATE INDEX IF NOT EXISTS deals_embedding_idx
  ON deals USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS user_interests_embedding_idx
  ON user_interests USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- 7. 매칭 함수
-- ============================================

-- 특정 유저의 관심사와 유사한 매물 찾기
CREATE OR REPLACE FUNCTION match_deals_for_user(
  p_user_id        uuid,
  p_match_threshold float DEFAULT 0.50,
  p_match_count     int   DEFAULT 20
)
RETURNS TABLE (deal_id uuid, similarity float) AS $$
  SELECT
    d.id     AS deal_id,
    1 - (d.embedding <=> ui.embedding) AS similarity
  FROM deals d
  CROSS JOIN user_interests ui
  WHERE ui.user_id    = p_user_id
    AND d.status      = 'approved'
    AND d.embedding   IS NOT NULL
    AND ui.embedding  IS NOT NULL
    AND 1 - (d.embedding <=> ui.embedding) > p_match_threshold
    -- 가격 범위 소프트 필터 (설정된 경우)
    AND (ui.max_price IS NULL OR d.asking_price IS NULL OR d.asking_price <= ui.max_price * 1.2)
    AND (ui.min_price IS NULL OR d.asking_price IS NULL OR d.asking_price >= ui.min_price * 0.8)
  ORDER BY d.embedding <=> ui.embedding
  LIMIT p_match_count;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 특정 매물과 유사한 관심사를 가진 유저 찾기 (신규 매물 승인 시 사용)
CREATE OR REPLACE FUNCTION match_users_for_deal(
  p_deal_id        uuid,
  p_match_threshold float DEFAULT 0.50,
  p_match_count     int   DEFAULT 200
)
RETURNS TABLE (user_id uuid, similarity float) AS $$
  SELECT
    ui.user_id AS user_id,
    1 - (ui.embedding <=> d.embedding) AS similarity
  FROM user_interests ui
  CROSS JOIN deals d
  WHERE d.id           = p_deal_id
    AND d.embedding    IS NOT NULL
    AND ui.embedding   IS NOT NULL
    AND 1 - (ui.embedding <=> d.embedding) > p_match_threshold
  ORDER BY ui.embedding <=> d.embedding
  LIMIT p_match_count;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 8. Row Level Security
-- ============================================

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_matches   ENABLE ROW LEVEL SECURITY;

-- ── user_interests ──
DROP POLICY IF EXISTS "users manage own interests"   ON user_interests;
DROP POLICY IF EXISTS "admin read all interests"     ON user_interests;
DROP POLICY IF EXISTS "service upsert interests"     ON user_interests;

CREATE POLICY "users manage own interests"
  ON user_interests
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin read all interests"
  ON user_interests FOR SELECT
  USING (public.is_admin());

-- ── deal_matches ──
DROP POLICY IF EXISTS "users read own matches"   ON deal_matches;
DROP POLICY IF EXISTS "admin read all matches"   ON deal_matches;

-- 유저: 본인 매칭 결과만 열람
CREATE POLICY "users read own matches"
  ON deal_matches FOR SELECT
  USING (user_id = auth.uid());

-- 유저: 본인 매칭 읽음 표시
CREATE POLICY "users update own matches"
  ON deal_matches FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 관리자: 전체 열람
CREATE POLICY "admin read all matches"
  ON deal_matches FOR SELECT
  USING (public.is_admin());

-- ============================================
-- 9. 통계 뷰 (관리자용)
-- ============================================
CREATE OR REPLACE VIEW match_stats AS
SELECT
  d.id          AS deal_id,
  d.title,
  d.industry,
  COUNT(dm.id)  AS match_count,
  AVG(dm.similarity_score)::float AS avg_similarity,
  MAX(dm.similarity_score)::float AS max_similarity,
  SUM(CASE WHEN dm.is_read THEN 1 ELSE 0 END) AS read_count
FROM deals d
LEFT JOIN deal_matches dm ON dm.deal_id = d.id
WHERE d.status = 'approved'
GROUP BY d.id, d.title, d.industry
ORDER BY match_count DESC;

-- ============================================
-- 10. 적용 순서 요약
-- ============================================
-- 1. 이 SQL 실행
-- 2. Supabase 대시보드 > Database > Extensions > vector 활성화 확인
-- 3. 환경변수 설정:
--    OPENAI_API_KEY=sk-...
--    SUPABASE_SERVICE_ROLE_KEY=eyJ...  (Supabase > Settings > API)
--    CRON_SECRET=임의의_긴_문자열
-- 4. Vercel 환경변수에도 동일하게 설정
