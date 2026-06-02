import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createEmbedding, dealToText, interestToText } from '@/lib/embeddings'
import { Deal } from '@/types'
import { UserInterest } from '@/types/matching'

// GET /api/batch-embed
// Vercel Cron 또는 수동 호출 (매일 09:00)
// 1. 임베딩 없는 approved 매물 일괄 처리
// 2. 임베딩 없는 user_interests 일괄 처리
// 3. 전체 매칭 재계산
export async function GET(req: NextRequest) {
  // Cron 인증
  const cronSecret = req.headers.get('x-cron-secret')
    ?? req.nextUrl.searchParams.get('secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { deals: 0, interests: 0, matches: 0, errors: [] as string[] }

  // ── 1. 임베딩 없는 approved 매물 처리 ──────────────────────
  const { data: unembeddedDeals } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('status', 'approved')
    .is('embedding', null)
    .limit(50) // 배치당 최대 50개

  for (const deal of (unembeddedDeals ?? [])) {
    try {
      const text = dealToText(deal as Deal)
      const embedding = await createEmbedding(text)
      await supabaseAdmin
        .from('deals')
        .update({ embedding: JSON.stringify(embedding), embedded_at: new Date().toISOString() })
        .eq('id', deal.id)
      results.deals++
    } catch (e) {
      results.errors.push(`deal:${deal.id}: ${String(e)}`)
    }
  }

  // ── 2. 임베딩 없는 user_interests 처리 ─────────────────────
  const { data: unembeddedInterests } = await supabaseAdmin
    .from('user_interests')
    .select('*')
    .is('embedding', null)
    .limit(100)

  for (const interest of (unembeddedInterests ?? [])) {
    try {
      const text = interestToText(interest as UserInterest)
      const embedding = await createEmbedding(text)
      await supabaseAdmin
        .from('user_interests')
        .update({ embedding: JSON.stringify(embedding), embedded_at: new Date().toISOString() })
        .eq('id', interest.id)
      results.interests++
    } catch (e) {
      results.errors.push(`interest:${interest.id}: ${String(e)}`)
    }
  }

  // ── 3. 임베딩이 완성된 유저들의 매칭 재계산 ─────────────────
  const { data: usersWithEmbedding } = await supabaseAdmin
    .from('user_interests')
    .select('user_id')
    .not('embedding', 'is', null)
    .limit(200)

  for (const { user_id } of (usersWithEmbedding ?? [])) {
    try {
      const { data: matchedDeals } = await supabaseAdmin
        .rpc('match_deals_for_user', {
          p_user_id:         user_id,
          p_match_threshold: 0.50,
          p_match_count:     50,
        })

      const deals = (matchedDeals ?? []) as { deal_id: string; similarity: number }[]
      if (deals.length > 0) {
        const rows = deals.map(d => ({
          user_id,
          deal_id:         d.deal_id,
          similarity_score: d.similarity,
          is_notified:     false,
          is_read:         false,
        }))
        await supabaseAdmin
          .from('deal_matches')
          .upsert(rows, { onConflict: 'user_id,deal_id', ignoreDuplicates: true })
        results.matches += deals.length
      }
    } catch (e) {
      results.errors.push(`match:${user_id}: ${String(e)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results,
    timestamp: new Date().toISOString(),
  })
}
