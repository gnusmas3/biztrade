'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DealMatch } from '@/types/matching'
import { getMatchLabel } from '@/lib/embeddings'

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

function ScoreBadge({ score }: { score: number }) {
  const { label, color } = getMatchLabel(score)
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
      <span className="text-xs font-bold text-gray-700">{pct}%</span>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.80 ? 'bg-green-500' : score >= 0.65 ? 'bg-blue-500' : 'bg-gray-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function MyMatchesPage() {
  const router = useRouter()
  const [matches,  setMatches]  = useState<DealMatch[]>([])
  const [loading,  setLoading]  = useState(true)
  const [hasInterests, setHasInterests] = useState(true)
  const [userId,   setUserId]   = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth?redirect=/my-matches'); return }
      setUserId(session.user.id)

      // 관심사 설정 여부 확인
      const { data: interest } = await supabase
        .from('user_interests')
        .select('id, embedded_at')
        .eq('user_id', session.user.id)
        .maybeSingle()
      setHasInterests(!!interest?.embedded_at)

      // 매칭 결과 조회
      const { data: matchData } = await supabase
        .from('deal_matches')
        .select(`
          *,
          deals (id, title, industry, region, annual_revenue, operating_profit, asking_price, status)
        `)
        .eq('user_id', session.user.id)
        .order('similarity_score', { ascending: false })

      setMatches((matchData as DealMatch[]) ?? [])

      // 전체 읽음 처리
      await supabase
        .from('deal_matches')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)

      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-serif mb-1">AI 추천 매물</h1>
          <p className="text-gray-500 text-sm">관심사와 유사도가 높은 매물 순으로 정렬됩니다.</p>
        </div>
        <Link
          href="/interests"
          className="text-xs px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          관심사 수정
        </Link>
      </div>

      {!hasInterests ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">관심사를 먼저 설정해주세요</h3>
          <p className="text-gray-500 text-sm mb-6">
            업종, 지역, 희망가격을 설정하면<br />AI가 최적의 매물을 추천해드립니다.
          </p>
          <Link href="/interests" className="btn-primary">
            관심사 설정하기
          </Link>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <p className="text-sm font-medium">아직 매칭된 매물이 없습니다.</p>
          <p className="text-xs mt-1">새 매물이 등록되면 자동으로 분석됩니다.</p>
          <Link href="/interests" className="inline-block mt-5 text-sm text-blue-600 hover:underline">
            관심사 다시 설정하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '전체 추천',   value: `${matches.length}개`, color: 'text-gray-900' },
              { label: '높은 매칭',   value: `${matches.filter(m => m.similarity_score >= 0.65).length}개`, color: 'text-blue-700' },
              { label: '최고 매칭도', value: `${Math.round((matches[0]?.similarity_score ?? 0) * 100)}%`, color: 'text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {matches.map(match => {
            const deal = match.deals
            if (!deal) return null
            return (
              <Link
                key={match.id}
                href={`/deals/${deal.id}`}
                className="card p-5 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500">{deal.industry} · {deal.region}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <ScoreBadge score={match.similarity_score} />
                    <div className="w-24">
                      <ScoreBar score={match.similarity_score} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '연매출',   value: fmt(deal.annual_revenue) },
                    { label: 'EBITDA',   value: fmt(deal.operating_profit) },
                    { label: '희망매각가', value: fmt(deal.asking_price) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>매칭 {new Date(match.created_at).toLocaleDateString('ko-KR')}</span>
                  <span className="text-blue-600 hover:underline">상세 보기 →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
