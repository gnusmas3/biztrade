'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface InquiryWithDeal {
  id: string; deal_id: string; name: string; email: string
  phone: string | null; message: string | null; reply: string | null
  replied_at: string | null; created_at: string
  deals?: { title: string } | null
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryWithDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InquiryWithDeal | null>(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterReply, setFilterReply] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('inquiries').select('*, deals(title)').order('created_at', { ascending: false })
      .then(({ data }) => { setInquiries((data as InquiryWithDeal[]) ?? []); setLoading(false) })
  }, [])

  const openDetail = (inq: InquiryWithDeal) => { setSelected(inq); setReply(inq.reply ?? '') }

  const saveReply = async () => {
    if (!selected || !reply.trim()) return
    setSaving(true)
    const { error } = await supabase.from('inquiries')
      .update({ reply: reply.trim(), replied_at: new Date().toISOString() }).eq('id', selected.id)
    if (!error) {
      const updated = { ...selected, reply: reply.trim(), replied_at: new Date().toISOString() }
      setInquiries(prev => prev.map(i => i.id === selected.id ? updated : i))
      setSelected(updated)
    }
    setSaving(false)
  }

  const deleteReply = async () => {
    if (!selected) return
    setSaving(true)
    await supabase.from('inquiries').update({ reply: null, replied_at: null }).eq('id', selected.id)
    const updated = { ...selected, reply: null, replied_at: null }
    setInquiries(prev => prev.map(i => i.id === selected.id ? updated : i))
    setSelected(updated); setReply('')
    setSaving(false)
  }

  const filtered = inquiries.filter(i => {
    const matchReply = filterReply === 'all' ? true : filterReply === 'replied' ? !!i.reply : !i.reply
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()) || (i.message ?? '').toLowerCase().includes(search.toLowerCase())
    return matchReply && matchSearch
  })

  const repliedCount = inquiries.filter(i => !!i.reply).length

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
        <div className="flex gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1">
          {[{ key: 'all', label: `전체 (${inquiries.length})` }, { key: 'pending', label: `미답변 (${inquiries.length - repliedCount})` }, { key: 'replied', label: `답변완료 (${repliedCount})` }].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterReply(key)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${filterReply === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
          ))}
        </div>
        <div className="mb-4">
          <input type="text" placeholder="이름, 이메일, 내용 검색" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 bg-gray-200 rounded-full" /><div className="h-3 bg-gray-200 rounded w-32" /></div>
                <div className="h-3 bg-gray-100 rounded w-full ml-11" />
              </div>
            ))}</div>
          ) : filtered.length === 0 ? <div className="text-center py-16 text-gray-400 text-sm">문의가 없습니다.</div> : (
            <div className="divide-y divide-gray-100">
              {filtered.map(inq => (
                <div key={inq.id} onClick={() => openDetail(inq)} className={`px-5 py-4 cursor-pointer hover:bg-gray-50 ${selected?.id === inq.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">{inq.name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{inq.name}</span>
                        <span className="text-xs text-gray-400">{inq.email}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-auto ${inq.reply ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {inq.reply ? '답변완료' : '미답변'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-11">
                    {inq.deals?.title && <p className="text-xs text-blue-600 mb-1">📋 {inq.deals.title}</p>}
                    <p className="text-sm text-gray-600 line-clamp-2">{inq.message || '(내용 없음)'}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{new Date(inq.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">문의 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">{selected.name[0].toUpperCase()}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-xs text-gray-400">{selected.phone}</p>}
                </div>
              </div>
              {selected.deals?.title && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-blue-600 font-medium">관련 매물</p>
                  <p className="text-sm text-blue-800">{selected.deals.title}</p>
                </div>
              )}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">문의 내용</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message || '(내용 없음)'}</div>
                <p className="text-xs text-gray-400 mt-2">{new Date(selected.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">답변 작성</p>
                  {selected.replied_at && <span className="text-xs text-green-600">답변완료 · {new Date(selected.replied_at).toLocaleDateString('ko-KR')}</span>}
                </div>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5}
                  placeholder="고객에게 전달할 답변을 입력하세요…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveReply} disabled={saving || !reply.trim()}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                    {saving ? '저장 중…' : selected.reply ? '답변 수정' : '답변 등록'}
                  </button>
                  {selected.reply && <button onClick={deleteReply} disabled={saving} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">삭제</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
