'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDUSTRIES = ['카페/외식업', '제조업', '유통업', '온라인 쇼핑몰', '학원/교육업', '기타']

const INITIAL = {
  title: '', industry: '', region: '', founded_year: '', employee_count: '',
  annual_revenue: '', operating_profit: '', net_profit: '', asking_price: '',
  description: '', strengths: '', risks: '', reason_for_sale: '',
  contact_email: '', contact_phone: '',
}

export default function SellPage() {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (status: 'draft' | 'pending') => {
    if (!form.title || !form.industry || !form.region || !form.contact_email) {
      setError('기업명, 업종, 지역, 연락처 이메일은 필수입니다.')
      return
    }
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const seller_id = session?.user?.id ?? null
    const { error: err } = await supabase.from('deals').insert({
      title: form.title, industry: form.industry, region: form.region,
      founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      employee_count: form.employee_count ? parseInt(form.employee_count) : null,
      annual_revenue: form.annual_revenue ? parseInt(form.annual_revenue) : null,
      operating_profit: form.operating_profit ? parseInt(form.operating_profit) : null,
      net_profit: form.net_profit ? parseInt(form.net_profit) : null,
      asking_price: form.asking_price ? parseInt(form.asking_price) : null,
      description: form.description, strengths: form.strengths,
      risks: form.risks, reason_for_sale: form.reason_for_sale,
      contact_email: form.contact_email, contact_phone: form.contact_phone,
      status,
      seller_id,
    })
    setLoading(false)
    if (err) setError('등록에 실패했습니다. 다시 시도해주세요.')
    else setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-3">등록이 완료되었습니다</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          매물이 검토 대기 중입니다.<br />
          관리자 검토 후 1~2 영업일 내 공개됩니다.<br />
          문의사항은 contact@biztrade.kr로 연락해 주세요.
        </p>
        <button onClick={() => setDone(false)} className="btn-primary mt-8">
          추가 매물 등록하기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">매물 등록</h1>
        <p className="text-gray-500 text-sm">아래 정보를 입력하시면 관리자 검토 후 매물이 게시됩니다.</p>
      </div>

      <div className="space-y-8">
        {/* 기본 정보 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">1</span>
            기본 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">기업/매장명 *</label>
              <input name="title" value={form.title} onChange={handle} className="input-field" placeholder="예: 성수동 디저트 카페" />
            </div>
            <div>
              <label className="label">업종 *</label>
              <select name="industry" value={form.industry} onChange={handle} className="input-field">
                <option value="">선택하세요</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">지역 *</label>
              <input name="region" value={form.region} onChange={handle} className="input-field" placeholder="예: 서울 성동구" />
            </div>
            <div>
              <label className="label">설립연도</label>
              <input name="founded_year" type="number" value={form.founded_year} onChange={handle} className="input-field" placeholder="예: 2018" />
            </div>
            <div>
              <label className="label">직원 수</label>
              <input name="employee_count" type="number" value={form.employee_count} onChange={handle} className="input-field" placeholder="예: 5" />
            </div>
          </div>
        </section>

        {/* 재무 정보 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">2</span>
            재무 정보 (원 단위)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'annual_revenue', label: '연매출', placeholder: '예: 850000000' },
              { name: 'operating_profit', label: '영업이익', placeholder: '예: 95000000' },
              { name: 'net_profit', label: '순이익', placeholder: '예: 72000000' },
              { name: 'asking_price', label: '희망 매각가', placeholder: '예: 280000000' },
            ].map(f => (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                <input name={f.name} type="number" value={(form as any)[f.name]} onChange={handle} className="input-field" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </section>

        {/* 사업 설명 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">3</span>
            사업 설명
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">사업 설명</label>
              <textarea name="description" rows={3} value={form.description} onChange={handle} className="input-field resize-none" placeholder="사업을 간략히 설명해 주세요." />
            </div>
            <div>
              <label className="label">강점</label>
              <textarea name="strengths" rows={3} value={form.strengths} onChange={handle} className="input-field resize-none" placeholder="사업의 주요 강점을 입력하세요." />
            </div>
            <div>
              <label className="label">리스크</label>
              <textarea name="risks" rows={3} value={form.risks} onChange={handle} className="input-field resize-none" placeholder="잠재적 리스크를 솔직하게 기재해 주세요." />
            </div>
            <div>
              <label className="label">매각 사유</label>
              <textarea name="reason_for_sale" rows={2} value={form.reason_for_sale} onChange={handle} className="input-field resize-none" placeholder="매각을 결정하게 된 이유를 입력하세요." />
            </div>
          </div>
        </section>

        {/* 연락처 */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-700 text-white rounded flex items-center justify-center text-xs">4</span>
            연락처
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">이메일 *</label>
              <input name="contact_email" type="email" value={form.contact_email} onChange={handle} className="input-field" placeholder="email@example.com" />
            </div>
            <div>
              <label className="label">전화번호</label>
              <input name="contact_phone" value={form.contact_phone} onChange={handle} className="input-field" placeholder="010-0000-0000" />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => submit('draft')} disabled={loading} className="flex-1 py-4 text-base border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50">
            {loading ? '저장 중...' : '임시저장'}
          </button>
          <button onClick={() => submit('pending')} disabled={loading} className="flex-1 btn-primary py-4 text-base">
            {loading ? '신청 중...' : '검토 요청'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          등록된 정보는 관리자 검토 후 게시됩니다. 허위 정보 등록 시 이용이 제한될 수 있습니다.
        </p>
      </div>
    </div>
  )
}
