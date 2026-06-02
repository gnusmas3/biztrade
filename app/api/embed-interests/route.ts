import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createEmbedding, interestToText } from '@/lib/embeddings'
import { UserInterest } from '@/types/matching'

// POST /api/embed-interests
// body: UserInterest 필드들
// 1. user_interests upsert
// 2. 관심사 임베딩 생성
// 3. 유사 매물 탐색
// 4. deal_matches upsert
export async function POST(req: NextRequest) {
  // 로그인 유저 확인
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.slice(7)
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await req.json()
  const interest: Partial<UserInterest> & { user_id: string } = {
    user_id:    user.id,
    industries: body.industries ?? [],
    regions:    body.regions    ?? [],
    min_price:  body.min_price  ?? null,
    max_price:  body.max_price  ?? null,
    min_ebitda: body.min_ebitda ?? null,
    max_ebitda: body.max_ebitda ?? null,
    notes:      body.notes      ?? null,
  }

  // 임베딩 생성
  const text = interestToText(interest as UserInterest)
  let embedding: number[]
  try {
    embedding = await createEmbedding(text)
  } catch (e) {
    return NextResponse.json({ error: 'Embedding failed', detail: String(e) }, { status: 500 })
  }

  // user_interests upsert
  const { error: upsertErr } = await supabaseAdmin
    .from('user_interests')
    .upsert({
      ...interest,
      embedding:   JSON.stringify(embedding),
      embedded_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (upsertErr) {
    return NextResponse.json({ error: 'Failed to save interests' }, { status: 500 })
  }

  // 기존 매칭 결과 삭제 후 재계산
  await supabaseAdmin.from('deal_matches').delete().eq('user_id', user.id)

  // pgvector로 유사 매물 탐색
  const { data: matchedDeals, error: matchErr } = await supabaseAdmin
    .rpc('match_deals_for_user', {
      p_user_id:         user.id,
      p_match_threshold: 0.50,
      p_match_count:     50,
    })
  if (matchErr) {
    console.error('match_deals_for_user error:', matchErr)
    return NextResponse.json({ saved: true, matched: 0 })
  }

  const deals = (matchedDeals ?? []) as { deal_id: string; similarity: number }[]

  if (deals.length > 0) {
    const rows = deals.map(d => ({
      user_id:         user.id,
      deal_id:         d.deal_id,
      similarity_score: d.similarity,
      is_notified:     false,
      is_read:         false,
    }))
    await supabaseAdmin
      .from('deal_matches')
      .upsert(rows, { onConflict: 'user_id,deal_id' })
  }

  return NextResponse.json({ saved: true, matched: deals.length })
}
