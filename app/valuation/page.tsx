'use client'
import { useState } from 'react'

const INDUSTRIES = [
  { label: '카페/외식업', value: '카페/외식업', multiple: 2.0 },
  { label: '제조업', value: '제조업', multiple: 3.5 },
  { label: '유통업', value: '유통업', multiple: 2.5 },
  { label: '온라인 쇼핑몰', value: '온라인 쇼핑몰', multiple: 2.0 },
  { label: '학원/교육업', value: '학원/교육업', multiple: 2.5 },
  { label: '기타', value: '기타', multiple: 2.0 },
]

function fmt(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

export default function ValuationPage() {
  const [form, setForm] = useState({
    industry: '카페/외식업',
    annual_revenue: '',
    operating_profit: '',
    net_profit: '',
    growth: 'normal',
    ceo_dependency: 'normal',
    customer_concentration: 'normal',
  })
  const [result, setResult] = useState<null | { conservative: number; fair: number; aggressive: number; comment: string }>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const calculate = () => {
    const industryData = INDUSTRIES.find(i => i.value === form.industry)!
    let multiple = industryData.multiple

    if (form.growth === 'high') multiple += 0.5
    if (form.ceo_dependency === 'high') multiple -= 0.5
    if (form.customer_concentration === 'high') multiple -= 0.5

    const profit = parseFloat(form.operating_profit) || 0
    if (profit <= 0) { alert('영업이익을 입력해주세요.'); return }

    const fair = profit * multiple
    const conservative = fair * 0.8
    const aggressive = fair * 1.3

    const comments = []
    if (form.growth === 'high') comments.push('성장률이 높아 프리미엄이 적용되었습니다.')
    if (form.ceo_dependency === 'high') comments.push('대표 의존도가 높아 할인 요소로 반영되었습니다.')
    if (form.customer_concentration === 'high') comments.push('거래처 집중도가 높아 리스크 할인이 적용되었습니다.')
    const comment = comments.length > 0 ? comments.join(' ') : '특별한 조정 요소 없이 업종 기본 배수가 적용되었습니다.'

    setResult({ conservative, fair, aggressive, comment })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">기업가치 계산기</h1>
        <p className="text-gray-500 text-sm">업종별 배수와 재무 지표를 기반으로 기업가치 범위를 추정합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">재무 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="label">업종</label>
                <select name="industry" value={form.industry} onChange={handle} className="input-field">
                  {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label} ({i.multiple}x)</option>)}
                </select>
              </div>
              <div>
                <label className="label">연매출 (원)</label>
                <input name="annual_revenue" type="number" value={form.annual_revenue} onChange={handle} className="input-field" placeholder="예: 850000000" />
              </div>
              <div>
                <label className="label">영업이익 (원) *</label>
                <input name="operating_profit" type="number" value={form.operating_profit} onChange={handle} className="input-field" placeholder="예: 95000000" />
              </div>
              <div>
                <label className="label">순이익 (원)</label>
                <input name="net_profit" type="number" value={form.net_profit} onChange={handle} className="input-field" placeholder="예: 72000000" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">조정 요소</h2>
            <div className="space-y-4">
              {[
                { name: 'growth', label: '매출 성장률', options: [{ v: 'low', l: '낮음 (5% 미만)' }, { v: 'normal', l: '보통 (5~15%)' }, { v: 'high', l: '높음 (15% 초과) +0.5배' }] },
                { name: 'ceo_dependency', label: '대표 의존도', options: [{ v: 'low', l: '낮음' }, { v: 'normal', l: '보통' }, { v: 'high', l: '높음 (시스템 부재) -0.5배' }] },
                { name: 'customer_concentration', label: '거래처 집중도', options: [{ v: 'low', l: '낮음 (다수 거래처)' }, { v: 'normal', l: '보통' }, { v: 'high', l: '높음 (상위 3곳 70%+) -0.5배' }] },
              ].map(({ name, label, options }) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <select name={name} value={(form as any)[name]} onChange={handle} className="input-field">
                    {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button onClick={calculate} className="btn-primary w-full py-3.5">
            가치평가 계산하기
          </button>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="space-y-4">
              <div className="card p-6 border-l-4 border-blue-600">
                <h2 className="font-semibold text-gray-900 mb-5">예상 기업가치</h2>
                {[
                  { label: '보수적 가치', value: result.conservative, color: 'text-gray-700', bg: 'bg-gray-50' },
                  { label: '적정 가치', value: result.fair, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: '공격적 가치', value: result.aggressive, color: 'text-green-700', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-4 mb-3`}>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <p className="text-xs font-medium text-amber-800 mb-1">📊 분석 코멘트</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{result.comment}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-xs text-gray-500 leading-relaxed">
                <p className="font-medium text-gray-700 mb-2">⚠️ 주의사항</p>
                본 계산 결과는 참고용 추정치입니다. 실제 기업가치는 시장 상황, 자산 가치, 성장 가능성, 브랜드 가치 등 다양한 요소에 따라 달라집니다. 중요한 의사결정 전에 반드시 전문가 자문을 받으시기 바랍니다.
              </div>
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center h-full min-h-64 text-gray-400">
              <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <p className="text-sm">좌측에 정보를 입력하고<br />계산 버튼을 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* Methodology */}
      <div className="mt-10 card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">계산 방법</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
          <div>
            <p className="font-medium text-gray-800 mb-2">기본 공식</p>
            <p className="bg-gray-50 p-3 rounded-lg font-mono">기업가치 = 영업이익 × 업종별 배수</p>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-2">업종별 기본 배수</p>
            <table className="w-full">
              <tbody>
                {INDUSTRIES.map(i => (
                  <tr key={i.value} className="border-b border-gray-100 last:border-0">
                    <td className="py-1">{i.label}</td>
                    <td className="py-1 text-right font-medium text-blue-700">{i.multiple}배</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
