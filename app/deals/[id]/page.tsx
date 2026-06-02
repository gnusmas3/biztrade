'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Deal } from '@/types'

function fmt(n?: number) {
  if (!n) return '미공개'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

function pct(revenue?: number, profit?: number) {
  if (!revenue || !profit) return '-'
  return `${((profit / revenue) * 100).toFixed(1)}%`
}

const MULTIPLIERS: Record<string, number> = {
  '카페/외식업': 2.0, '제조업': 3.5, '유통업': 2.5, '온라인 쇼핑몰': 2.0, '학원/교육업': 2.5,
}

const DUE_DILIGENCE = [
  '법인등기부등본 확인', '최근 3년 재무제표 검토', '세금 체납 여부 확인',
  '임대차 계약서 확인 (잔여 기간, 조건)', '주요 거래처 계약 현황 파악',
  '직원 고용 현황 및 퇴직금 부채 확인', '지적재산권·허가증 양도 가능 여부',
  '주요 설비 상태 및 감가상각 현황', '계류 중인 소송·분쟁 여부 확인',
]

const CHECKLIST_COLORS = ['text-blue-700', 'text-green-700', 'text-purple-700', 'text-amber-700']

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [interested, setInterested] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  useEffect(() => {
    const init = async () => {
      const [{ data: dealData }, { data: { session } }] = await Promise.all([
        supabase.from('deals').select('*').eq('id', params.id).single(),
        supabase.auth.getSession(),
      ])
      setDeal(dealData as Deal)
      const uid = session?.user?.id ?? null
      setUserId(uid)

      if (uid && dealData) {
        const { data: interest } = await supabase
          .from('deal_interests')
          .select('id')
          .eq('user_id', uid)
          .eq('deal_id', dealData.id)
          .maybeSingle()
        setInterested(!!interest)
      }
      setLoading(false)
    }
    init()
  }, [params.id])

  const toggleInterest = async () => {
    if (!userId) { setShowAuthPrompt(true); return }
    if (!deal) return
    setInterestLoading(true)
    if (interested) {
      await supabase.from('deal_interests')
        .delete().eq('user_id', userId).eq('deal_id', deal.id)
      setInterested(false)
    } else {
      await supabase.from('deal_interests')
        .insert({ user_id: userId, deal_id: deal.id })
      setInterested(true)
    }
    setInterestLoading(false)
  }

  const startInquiry = async () => {
    if (!userId) { setShowAuthPrompt(true); return }
    if (!deal) return
    setInquiryLoading(true)

    // 이미 존재하는 방 확인
    const { data: existing } = await supabase
      .from('deal_rooms')
      .select('id')
      .eq('deal_id', deal.id)
      .eq('buyer_id', userId)
      .maybeSingle()

    if (existing) {
      router.push(`/inquiries/${existing.id}`)
      return
    }

    // 새 거래방 생성
    const { data: room, error } = await supabase
      .from('deal_rooms')
      .insert({
        deal_id: deal.id,
        buyer_id: userId,
        seller_id: deal.seller_id ?? null,
        status: 'new',
      })
      .select('id')
      .single()

    setInquiryLoading(false)
    if (room) router.push(`/inquiries/${room.id}`)
    else console.error(error)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-gray-500">
        <p>매물을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const baseMultiple = MULTIPLIERS[deal.industry] || 2.0
  const baseVal = (deal.operating_profit || 0) * baseMultiple

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Auth prompt */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-500 text-sm mb-6">인수문의 및 관심등록은 로그인 후 이용하실 수 있습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuthPrompt(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50">
                취소
              </button>
              <button onClick={() => router.push('/admin/login')} className="flex-1 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                로그인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">{deal.industry}</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {deal.region}
          </span>
          {deal.founded_year && (
            <span className="text-xs text-gray-500">설립 {deal.founded_year}년</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">{deal.title}</h1>
        <p className="text-gray-600 leading-relaxed">{deal.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financials */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-600 rounded-full inline-block"/>
              재무 현황
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '연매출', value: fmt(deal.annual_revenue) },
                { label: '영업이익', value: fmt(deal.operating_profit) },
                { label: '순이익', value: fmt(deal.net_profit) },
                { label: '영업이익률', value: pct(deal.annual_revenue, deal.operating_profit) },
                { label: '순이익률', value: pct(deal.annual_revenue, deal.net_profit) },
                { label: '직원 수', value: deal.employee_count ? `${deal.employee_count}명` : '미공개' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {(deal.strengths || deal.risks) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deal.strengths && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"/>강점
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{deal.strengths}</p>
                </div>
              )}
              {deal.risks && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"/>리스크
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{deal.risks}</p>
                </div>
              )}
            </div>
          )}

          {deal.reason_for_sale && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-2 text-sm">매각 사유</h2>
              <p className="text-sm text-gray-600">{deal.reason_for_sale}</p>
            </div>
          )}

          {deal.operating_profit && (
            <div className="card p-6 border-l-4 border-blue-600">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full inline-block"/>
                간단 가치평가
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: '보수적', value: baseVal * 0.8 },
                  { label: '적정', value: baseVal },
                  { label: '공격적', value: baseVal * 1.3 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="font-bold text-gray-900 text-sm">{fmt(value)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                영업이익 × {baseMultiple}배 기준 (업종: {deal.industry}). 정확한 평가는 전문가 자문을 권장합니다.
              </p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-600 rounded-full inline-block"/>
              실사 체크리스트
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {DUE_DILIGENCE.map((item, i) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${CHECKLIST_COLORS[i % 4]}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-6">
            <p className="text-xs text-gray-500 mb-1">희망 매각가</p>
            <p className="text-3xl font-bold text-blue-700 mb-5">{fmt(deal.asking_price)}</p>

            {/* 인수문의 시작 */}
            <button
              onClick={startInquiry}
              disabled={inquiryLoading}
              className="btn-primary w-full mb-3 disabled:opacity-50"
            >
              {inquiryLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  처리 중...
                </span>
              ) : '인수문의 시작'}
            </button>

            {/* 관심등록 토글 */}
            <button
              onClick={toggleInterest}
              disabled={interestLoading}
              className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                interested
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className={`w-4 h-4 ${interested ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              {interested ? '관심 해제' : '관심등록'}
            </button>
          </div>

          {/* NDA 안내 */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span className="text-xs font-semibold text-indigo-700">비밀유지계약(NDA)</span>
            </div>
            <p className="text-xs text-indigo-600 leading-relaxed">
              인수문의 시작 후 NDA에 동의하시면 셀러와 직접 소통하실 수 있습니다. 모든 정보는 비밀로 유지됩니다.
            </p>
          </div>

          {/* 진행 단계 안내 */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-700 mb-3">인수 진행 단계</p>
            {[
              { step: '01', label: '문의 시작', desc: '인수문의 채널 개설' },
              { step: '02', label: 'NDA 체결', desc: '비밀유지계약 서명' },
              { step: '03', label: '실사 진행', desc: '재무·법무 서류 검토' },
              { step: '04', label: '가격 협상', desc: '조건 협의 및 확정' },
              { step: '05', label: '거래 종료', desc: '계약 체결 완료' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
