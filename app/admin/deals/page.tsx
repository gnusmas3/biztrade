'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Deal, DealStatus } from '@/types'

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-blue-100 text-blue-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  pending: '승인대기',
  approved: '승인',
  rejected: '반려',
  sold: '거래완료',
}

function DealsContent() {
  const searchParams = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? 'all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Deal | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => {
    supabase.from('deals').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setDeals((data as Deal[]) ?? []); setLoading(false) })
  }, [])

  const updateStatus = async (id: string, status: DealStatus, extra?: { admin_note?: string }) => {
    setUpdating(id)
    const updates: Record<string, unknown> = { status, ...extra }
    if (status === 'approved') updates.approved_at = new Date().toISOString()
    if (status === 'rejected') updates.rejected_at = new Date().toISOString()
    if (status === 'sold') updates.sold_at = new Date().toISOString()
    await supabase.from('deals').update(updates).eq('id', id)
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status, ...extra } : d))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, ...extra } : null)
    setUpdating(null)
  }

  const handleReject = async (id: string) => {
    await updateStatus(id, 'rejected', { admin_note: rejectNote })
    setRejectTarget(null)
    setRejectNote('')
  }

  const deleteDeal = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 되돌릴 수 없습니다.')) return
    setUpdating(id)
    await supabase.from('deals').delete().eq('id', id)
    setDeals(prev => prev.filter(d => d.id !== id))
    if (selected?.id === id) setSelected(null)
    setUpdating(null)
  }

  const filtered = deals.filter(d => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.industry.toLowerCase().includes(search.toLowerCase()) || d.region.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = {
    all: deals.length,
    pending: deals.filter(d => d.status === 'pending').length,
    approved: deals.filter(d => d.status === 'approved').length,
    rejected: deals.filter(d => d.status === 'rejected').length,
    draft: deals.filter(d => d.status === 'draft').length,
    sold: deals.filter(d => d.status === 'sold').length,
  }

  const tabs = [
    { key: 'all', label: `전체 (${counts.all})` },
    { key: 'pending', label: `승인대기 (${counts.pending})` },
    { key: 'approved', label: `승인 (${counts.approved})` },
    { key: 'rejected', label: `반려 (${counts.rejected})` },
    { key: 'draft', label: `초안 (${counts.draft})` },
    { key: 'sold', label: `거래완료 (${counts.sold})` },
  ]

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
        <div className="flex gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1 flex-wrap">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${filterStatus === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
          ))}
        </div>
        <div className="mb-4">
          <input type="text" placeholder="기업명, 업종, 지역 검색" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex gap-4">
                <div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-40" /><div className="h-3 bg-gray-100 rounded w-24" /></div>
                <div className="h-6 w-16 bg-gray-200 rounded-full" />
              </div>
            ))}</div>
          ) : filtered.length === 0 ? <div className="text-center py-16 text-gray-400 text-sm">해당 매물이 없습니다.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{['기업명','업종','지역','연매출','희망가','상태','등록일','액션'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(deal => (
                    <>
                      <tr key={deal.id} className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id === deal.id ? 'bg-blue-50' : ''}`} onClick={() => setSelected(deal)}>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-44 truncate">{deal.title}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{deal.industry}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{deal.region}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(deal.annual_revenue)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(deal.asking_price)}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[deal.status]}`}>{STATUS_LABELS[deal.status]}</span></td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(deal.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {deal.status !== 'approved' && deal.status !== 'sold' && <button disabled={updating === deal.id} onClick={() => updateStatus(deal.id, 'approved')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">승인</button>}
                            {deal.status !== 'rejected' && deal.status !== 'sold' && <button disabled={updating === deal.id} onClick={() => { setRejectTarget(deal.id); setRejectNote('') }} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50">반려</button>}
                            {deal.status === 'approved' && <button disabled={updating === deal.id} onClick={() => updateStatus(deal.id, 'sold')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50">거래완료</button>}
                            <button disabled={updating === deal.id} onClick={() => deleteDeal(deal.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">삭제</button>
                          </div>
                        </td>
                      </tr>
                      {rejectTarget === deal.id && (
                        <tr key={`${deal.id}-reject`} className="border-t border-gray-100 bg-yellow-50">
                          <td colSpan={8} className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600 mb-1 block">반려 사유</label>
                                <textarea
                                  rows={2}
                                  value={rejectNote}
                                  onChange={e => setRejectNote(e.target.value)}
                                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                                  placeholder="반려 사유를 입력하세요 (셀러에게 표시됩니다)"
                                />
                              </div>
                              <div className="flex gap-2 pb-0.5">
                                <button onClick={() => handleReject(deal.id)} disabled={updating === deal.id} className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">확인</button>
                                <button onClick={() => setRejectTarget(null)} className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">취소</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-0 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">매물 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-base mb-1">{selected.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
            </div>
            <div className="space-y-2 text-xs mb-5">
              {[
                { label: '업종', value: selected.industry }, { label: '지역', value: selected.region },
                { label: '설립연도', value: selected.founded_year ? `${selected.founded_year}년` : '-' },
                { label: '직원수', value: selected.employee_count ? `${selected.employee_count}명` : '-' },
                { label: '연매출', value: fmt(selected.annual_revenue) },
                { label: '영업이익', value: fmt(selected.operating_profit) },
                { label: '희망매각가', value: fmt(selected.asking_price) },
                { label: '연락처', value: selected.contact_email || selected.contact_phone || '-' },
                { label: '등록일', value: new Date(selected.created_at).toLocaleDateString('ko-KR') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0 gap-2">
                  <span className="text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-gray-900 font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
            {selected.description && <div className="mb-3"><p className="text-xs font-medium text-gray-500 mb-1">기업 설명</p><p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{selected.description}</p></div>}
            {selected.reason_for_sale && <div className="mb-4"><p className="text-xs font-medium text-gray-500 mb-1">매각 사유</p><p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{selected.reason_for_sale}</p></div>}
            {selected.admin_note && <div className="mb-4"><p className="text-xs font-medium text-gray-500 mb-1">반려 사유</p><p className="text-xs text-red-700 bg-red-50 rounded-lg p-3 leading-relaxed">{selected.admin_note}</p></div>}

            {rejectTarget === selected.id ? (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-600 mb-1 block">반려 사유</label>
                <textarea rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none mb-2" placeholder="반려 사유를 입력하세요" />
                <div className="flex gap-2">
                  <button onClick={() => handleReject(selected.id)} disabled={updating === selected.id} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">반려 확인</button>
                  <button onClick={() => setRejectTarget(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {selected.status !== 'approved' && selected.status !== 'sold' && <button disabled={updating === selected.id} onClick={() => updateStatus(selected.id, 'approved')} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">승인</button>}
                {selected.status !== 'rejected' && selected.status !== 'sold' && <button disabled={updating === selected.id} onClick={() => { setRejectTarget(selected.id); setRejectNote('') }} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">반려</button>}
                {selected.status === 'approved' && <button disabled={updating === selected.id} onClick={() => updateStatus(selected.id, 'sold')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">거래완료</button>}
                <button disabled={updating === selected.id} onClick={() => deleteDeal(selected.id)} className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium disabled:opacity-50">삭제</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DealsPage() {
  return <Suspense fallback={<div className="h-64 bg-gray-100 rounded-xl animate-pulse" />}><DealsContent /></Suspense>
}
