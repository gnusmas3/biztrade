import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DealCard from '@/components/DealCard'
import { Deal } from '@/types'

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    title: '검증된 매물',
    desc: '등록된 모든 매물은 검토 후 게시됩니다. 허위 매물 없는 신뢰할 수 있는 환경을 제공합니다.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    ),
    title: '간편 가치평가',
    desc: '업종별 배수와 재무 데이터 기반으로 기업가치를 자동 계산합니다.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    ),
    title: '실사 체크리스트',
    desc: '인수 전 놓쳐서는 안 될 핵심 실사 항목을 체계적으로 안내합니다.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: '인수 후 운영 지원',
    desc: '인수 완료 후 사업 안정화를 위한 운영 가이드와 전문가 네트워크를 연결합니다.',
  },
]

export default async function HomePage() {
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-medium bg-blue-700/30 border border-blue-600/40 text-blue-300 px-3 py-1 rounded-full mb-6">
              소규모 기업 M&A 플랫폼
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 font-serif">
              창업보다 안전한<br />기업 인수
            </h1>
            <p className="text-lg text-blue-100/80 mb-10 leading-relaxed">
              검증된 소규모 기업과 매장을 찾고,<br />
              분석하고, 인수하세요.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/deals" className="btn-primary bg-blue-600 hover:bg-blue-500 text-base px-8 py-3.5">
                매물 둘러보기
              </Link>
              <Link href="/sell" className="btn-secondary border-white/30 text-white hover:bg-white/10 text-base px-8 py-3.5">
                기업 매각 등록하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-6 justify-center md:justify-start text-sm">
          {[
            ['등록 매물', '150+'],
            ['성사 거래', '38건'],
            ['평균 거래 기간', '45일'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="font-bold text-lg">{v}</span>
              <span className="text-blue-200">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured deals */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-title">추천 매물</h2>
          <Link href="/deals" className="text-sm text-blue-700 hover:underline font-medium">
            전체 보기 →
          </Link>
        </div>

        {deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {deals.map(deal => <DealCard key={deal.id} deal={deal as Deal} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>현재 등록된 매물이 없습니다.</p>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">BizTrade가 다른 이유</h2>
            <p className="text-gray-500 text-sm">기업 인수의 모든 단계를 체계적으로 지원합니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-10 text-white text-center">
          <h2 className="text-2xl font-bold font-serif mb-3">지금 매물을 등록하세요</h2>
          <p className="text-blue-200 text-sm mb-7">검증된 인수자들이 귀사의 매물을 기다리고 있습니다.</p>
          <Link href="/sell" className="inline-block bg-white text-blue-700 font-medium px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors text-sm">
            매각 등록 시작하기
          </Link>
        </div>
      </section>
    </div>
  )
}
