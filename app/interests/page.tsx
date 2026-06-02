'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserInterest } from '@/types/matching'

const INDUSTRIES = ['카페/외식업', '제조업', '유통업', '온라인 쇼핑몰', '학원/교육업', '기타']
const REGIONS    = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '전국']

function Tag({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {label}
    </button>
  )
}

function PriceInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field pr-8"
          placeholder={placeholder}
          min="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">억원</span>
      </div>
    </div>
  )
}

export default function InterestsPage() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')
  const [session,  setSession]  = useState<{ access_token: string } | null>(null)
  const [existing, setExisting] = useState<UserInterest | null>(null)

  const [industries, setIndustries] = useState<string[]>([])
  const [regions,    setRegions]    = useState<string[]>([])
  const [minPrice,   setMinPrice]   = useState('')
  const [maxPrice,   setMaxPrice]   = useState('')
  const [minEbitda,  setMinEbitda]  = useState('')
  const [maxEbitda,  setMaxEbitda]  = useState('')
  const [notes,      setNotes]      = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.replace('/auth?redirect=/interests'); return }
      setSession(s)

      // 기존 관심사 불러오기
      const { data } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', s.user.id)
        .maybeSingle()

      if (data) {
        const d = data as UserInterest
        setExisting(d)
        setIndustries(d.industries ?? [])
        setRegions(d.regions ?? [])
        setMinPrice(d.min_price ? String(d.min_price / 100000000) : '')
        setMaxPrice(d.max_price ? String(d.max_price / 100000000) : '')
        setMinEbitda(d.min_ebitda ? String(d.min_ebitda / 100000000) : '')
        setMaxEbitda(d.max_ebitda ? String(d.max_ebitda / 100000000) : '')
        setNotes(d.notes ?? '')
      }
      setLoading(false)
    }
    init()
  }, [router])

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const handleSave = async () => {
    if (industries.length === 0 && regions.length === 0) {
      setError('업종 또는 지역을 하나 이상 선택해주세요.')
      return
    }
    setSaving(true)
    setError('')

    const body = {
      industries,
      regions,
      min_price:  minPrice  ? Math.round(parseFloat(minPrice)  * 100000000) : null,
      max_price:  maxPrice  ? Math.round(parseFloat(maxPrice)  * 100000000) : null,
      min_ebitda: minEbitda ? Math.round(parseFloat(minEbitda) * 100000000) : null,
      max_ebitda: maxEbitda ? Math.round(parseFloat(maxEbitda) * 100000000) : null,
      notes: notes.trim() || null,
    }

    const res = await fetch('/api/embed-interests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setDone(true)
      setTimeout(() => router.push('/my-matches'), 1500)
      // eslint-disable-next-line no-console
      console.log(`관심사 저장 완료 — 매칭된 매물: ${data.matched}개`)
    } else {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? '저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-2">AI 분석 완료!</h2>
        <p className="text-gray-500 text-sm">관심사를 분석해 맞춤 매물을 찾았습니다.<br />추천 매물 페이지로 이동합니다.</p>
        <div className="mt-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">관심사 설정</h1>
        <p className="text-gray-500 text-sm">
          인수 조건을 설정하면 AI가 최적의 매물을 추천해드립니다.
          {existing?.embedded_at && (
            <span className="ml-2 text-blue-600">
              마지막 업데이트: {new Date(existing.embedded_at).toLocaleDateString('ko-KR')}
            </span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        {/* 관심 업종 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">1</span>
            관심 업종
            <span className="text-xs text-gray-400 font-normal">(복수 선택 가능)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(ind => (
              <Tag
                key={ind}
                label={ind}
                active={industries.includes(ind)}
                onClick={() => toggle(industries, ind, setIndustries)}
              />
            ))}
          </div>
        </section>

        {/* 관심 지역 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">2</span>
            관심 지역
            <span className="text-xs text-gray-400 font-normal">(복수 선택 가능)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <Tag
                key={r}
                label={r}
                active={regions.includes(r)}
                onClick={() => toggle(regions, r, setRegions)}
              />
            ))}
          </div>
        </section>

        {/* 희망 인수가 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">3</span>
            희망 인수가격 범위
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <PriceInput label="최소 인수가" value={minPrice} onChange={setMinPrice} placeholder="예: 1" />
            <PriceInput label="최대 인수가" value={maxPrice} onChange={setMaxPrice} placeholder="예: 10" />
          </div>
        </section>

        {/* 희망 EBITDA */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">4</span>
            희망 EBITDA 범위
            <span className="text-xs text-gray-400 font-normal">(영업이익 기준)</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <PriceInput label="최소 EBITDA" value={minEbitda} onChange={setMinEbitda} placeholder="예: 0.5" />
            <PriceInput label="최대 EBITDA" value={maxEbitda} onChange={setMaxEbitda} placeholder="예: 3" />
          </div>
        </section>

        {/* 추가 조건 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">5</span>
            추가 조건 / 메모
            <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </h2>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-field resize-none"
            placeholder="예: 직원 5명 이하 소규모 사업체 선호, 서울 강남 / 서초 지역 한정, 수익성 위주 검토 등"
          />
          <p className="text-xs text-gray-400 mt-2">
            자유롭게 작성할수록 AI 매칭 정확도가 높아집니다.
          </p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              AI 분석 중... (10~20초 소요)
            </span>
          ) : (
            'AI 매칭 시작'
          )}
        </button>

        <p className="text-xs text-center text-gray-400">
          OpenAI Embeddings 기반 의미 유사도 분석 · 설정 변경 시 자동 재매칭
        </p>
      </div>
    </div>
  )
}
