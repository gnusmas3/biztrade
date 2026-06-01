'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DealCard from '@/components/DealCard'
import { Deal } from '@/types'

const INDUSTRIES = ['전체', '카페/외식업', '제조업', '유통업', '온라인 쇼핑몰', '학원/교육업', '기타']
const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '전국']

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState('전체')
  const [region, setRegion] = useState('전체')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRevenue, setMinRevenue] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      let q = supabase.from('deals').select('*').eq('status', 'approved').order('created_at', { ascending: false })
      if (industry !== '전체') q = q.eq('industry', industry)
      if (region !== '전체') q = q.ilike('region', `%${region}%`)
      if (maxPrice) q = q.lte('asking_price', parseInt(maxPrice) * 100000000)
      if (minRevenue) q = q.gte('annual_revenue', parseInt(minRevenue) * 100000000)
      const { data } = await q
      setDeals((data as Deal[]) || [])
      setLoading(false)
    }
    fetch()
  }, [industry, region, maxPrice, minRevenue])

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">매물 목록</h1>
        <p className="text-gray-500 text-sm">검증된 소규모 기업과 매장을 찾아보세요</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="w-full lg:w-60 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">필터</h2>

            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">업종</p>
              <div className="flex flex-col gap-1">
                {INDUSTRIES.map(i => (
                  <button
                    key={i}
                    onClick={() => setIndustry(i)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      industry === i ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">지역</p>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="input-field text-sm"
              >
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">희망가 상한 (억원)</p>
              <input
                type="number"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="input-field text-sm"
                placeholder="예: 10"
              />
            </div>

            <div className="mb-2">
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">연매출 하한 (억원)</p>
              <input
                type="number"
                value={minRevenue}
                onChange={e => setMinRevenue(e.target.value)}
                className="input-field text-sm"
                placeholder="예: 3"
              />
            </div>

            <button
              onClick={() => { setIndustry('전체'); setRegion('전체'); setMaxPrice(''); setMinRevenue('') }}
              className="mt-4 w-full text-xs text-gray-500 hover:text-gray-700 underline"
            >
              필터 초기화
            </button>
          </div>
        </aside>

        {/* Deal grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500">
              {loading ? '검색 중...' : `${deals.length}개의 매물`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-52 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p className="text-sm">조건에 맞는 매물이 없습니다.</p>
              <p className="text-xs mt-1">필터를 조정해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
