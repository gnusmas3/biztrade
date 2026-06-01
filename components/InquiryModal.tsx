'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  dealId: string
  dealTitle: string
  onClose: () => void
}

export default function InquiryModal({ dealId, dealTitle, onClose }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async () => {
    if (!form.name || !form.email) { setError('이름과 이메일은 필수입니다.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.from('inquiries').insert({
      deal_id: dealId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
    })
    setLoading(false)
    if (err) setError('문의 전송에 실패했습니다. 다시 시도해주세요.')
    else setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {done ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">문의가 접수되었습니다</h3>
            <p className="text-sm text-gray-500 mb-6">담당자가 영업일 기준 1~2일 내 연락드립니다.</p>
            <button onClick={onClose} className="btn-primary w-full">확인</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">문의하기</h3>
                <p className="text-xs text-gray-500 mt-0.5">{dealTitle}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">이름 *</label>
                <input name="name" value={form.name} onChange={handle} className="input-field" placeholder="홍길동" />
              </div>
              <div>
                <label className="label">이메일 *</label>
                <input name="email" type="email" value={form.email} onChange={handle} className="input-field" placeholder="email@example.com" />
              </div>
              <div>
                <label className="label">전화번호</label>
                <input name="phone" value={form.phone} onChange={handle} className="input-field" placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="label">문의 내용</label>
                <textarea name="message" value={form.message} onChange={handle} rows={4} className="input-field resize-none" placeholder="궁금한 점을 입력해주세요." />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">취소</button>
              <button onClick={submit} disabled={loading} className="btn-primary flex-1">
                {loading ? '전송 중...' : '문의 보내기'}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              제출된 정보는 비밀유지 원칙에 따라 처리됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
