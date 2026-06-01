'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Deal, Inquiry } from '@/types'

type Tab = 'deals' | 'inquiries'

function fmt(n?: number) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '검토 중', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '거절', color: 'bg-red-100 text-red-700' },
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('deals')
  const [deals, setDeals] = useState<Deal[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  const loadDeals = async () => {
    const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false })
    setDeals((data as Deal[]) || [])
  }

  const loadInquiries = async () => {
    const { data } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false })
    setInquiries((data as Inquiry[]) || [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadDeals(), loadInquiries()]).then(() => setLoading(false))
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('deals').update({ status }).eq('id', id)
    loadDeals()
  }

  const deleteDeal = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('deals').delete().eq('id', id)
    loadDeals()
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">관리자 대시보드</h1>
          <p className="text-xs text-gray-500">매물 및 문의 관리</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '전체 매물', value: deals.length, color: 'text-gray-900' },
          { label: '검토 중', value: deals.filter(d => d.status === 'pending').length, color: 'text-yellow-700' },
          { label: '승인됨', value: deals.filter(d => d.status === 'approved').length, color: 'text-green-700' },
          { label: '총 문의', value: inquiries.length, color: 'text-blue-700' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['deals', 'inquiries'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'deals' ? `매물 목록 (${deals.length})` : `문의 내역 (${inquiries.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : tab === 'deals' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['기업명', '업종', '지역', '연매출', '희망가', '상태', '등록일', '액션'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">등록된 매물이 없습니다.</td></tr>
              ) : (
                deals.map(deal => (
                  <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900 max-w-36 truncate">{deal.title}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{deal.industry}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{deal.region}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{fmt(deal.annual_revenue)}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{fmt(deal.asking_price)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[deal.status]?.color}`}>
                        {STATUS_LABELS[deal.status]?.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(deal.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        {deal.status !== 'approved' && (
                          <button onClick={() => updateStatus(deal.id, 'approved')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">승인</button>
                        )}
                        {deal.status !== 'rejected' && (
                          <button onClick={() => updateStatus(deal.id, 'rejected')} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">거절</button>
                        )}
                        <button onClick={() => deleteDeal(deal.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">문의 내역이 없습니다.</div>
          ) : (
            inquiries.map(inq => (
              <div key={inq.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-medium text-gray-900 text-sm">{inq.name}</span>
                  <span className="text-xs text-gray-500">{inq.email}</span>
                  {inq.phone && <span className="text-xs text-gray-500">{inq.phone}</span>}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{inq.message || '(내용 없음)'}</p>
                <p className="text-xs text-gray-400 mt-1">매물 ID: {inq.deal_id}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
