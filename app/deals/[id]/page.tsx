'use client'
import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import InquiryModal from '@/components/InquiryModal'
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
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('deals').select('*').eq('id', params.id).single()
      setDeal(data as Deal)
      setLoading(false)
    }
    fetch()
  }, [params.id])

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

          {/* Strengths & Risks */}
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

          {/* Quick valuation */}
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

          {/* Due diligence */}
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
          {/* Price card */}
          <div className="card p-6">
            <p className="text-xs text-gray-500 mb-1">희망 매각가</p>
            <p className="text-3xl font-bold text-blue-700 mb-4">{fmt(deal.asking_price)}</p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary w-full"
            >
              문의하기
            </button>
          </div>

          {/* NDA notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span className="text-xs font-semibold text-gray-700">비밀유지 안내</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              본 매물 정보는 비밀유지 원칙 하에 제공됩니다. 문의 시 수집되는 정보는 매물 관련 목적으로만 사용되며 제3자에게 공개되지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <InquiryModal dealId={deal.id} dealTitle={deal.title} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
