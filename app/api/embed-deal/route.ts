import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createEmbedding, dealToText } from '@/lib/embeddings'
import { Deal } from '@/types'

// ─── 관리자 인증 확인 ─────────────────────────────────────────
async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return false
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('user_id', user.id).single()
  return profile?.role === 'admin'
}

// POST /api/embed-deal
// body: { dealId: string }
// 1. 매물 임베딩 생성
// 2. 유사 관심사를 가진 유저 탐색
// 3. deal_matches 레코드 upsert
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dealId } = await req.json()
  if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

  // 매물 조회
  const { data: deal, error: dealErr } = await supabaseAdmin
    .from('deals').select('*').eq('id', dealId).single()
  if (dealErr || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // 임베딩 생성
  const text = dealToText(deal as Deal)
  let embedding: number[]
  try {
    embedding = await createEmbedding(text)
  } catch (e) {
    return NextResponse.json({ error: 'Embedding failed', detail: String(e) }, { status: 500 })
  }

  // deals 테이블에 임베딩 저장
  const { error: updateErr } = await supabaseAdmin
    .from('deals')
    .update({ embedding: JSON.stringify(embedding), embedded_at: new Date().toISOString() })
    .eq('id', dealId)
  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save embedding' }, { status: 500 })
  }

  // pgvector로 유사 유저 탐색
  const { data: matchedUsers, error: matchErr } = await supabaseAdmin
    .rpc('match_users_for_deal', {
      p_deal_id:        dealId,
      p_match_threshold: 0.50,
      p_match_count:     200,
    })
  if (matchErr) {
    console.error('match_users_for_deal error:', matchErr)
    return NextResponse.json({ embedded: true, matched: 0 })
  }

  const users = (matchedUsers ?? []) as { user_id: string; similarity: number }[]

  // deal_matches upsert
  if (users.length > 0) {
    const rows = users.map(u => ({
      user_id:         u.user_id,
      deal_id:         dealId,
      similarity_score: u.similarity,
      is_notified:     false,
      is_read:         false,
    }))
    await supabaseAdmin
      .from('deal_matches')
      .upsert(rows, { onConflict: 'user_id,deal_id', ignoreDuplicates: false })
  }

  return NextResponse.json({ embedded: true, matched: users.length })
}
