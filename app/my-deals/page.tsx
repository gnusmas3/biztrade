'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Deal, DealStatus } from '@/types'

const STATUS_STYLES: Record<DealStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-blue-100 text-blue-700',
}
const STATUS_LABELS: Record<DealStatus, string> = {
  draft: '초안',
  pending: '검토중',
  approved: '공개중',
  rejected: '반려',
  sold: '거래완료',
}

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

export default function MyDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (!uid) { setLoading(false); return }
      supabase.from('deals').select('*').eq('seller_id', uid).order('created_at', { ascending: false })
        .then(({ data }) => { setDeals((data as Deal[]) ?? []); setLoading(false) })
    })
  }, [])

  const requestReview = async (id: string) => {
    setUpdating(id)
    await supabase.from('deals').update({ status: 'pending' }).eq('id', id)
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status: 'pending' } : d))
    setUpdating(null)
  }

  if (!loading && !userId) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-500 text-sm">로그인 후 이용하실 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">내 매물</h1>
        <p className="text-gray-500 text-sm">등록하신 매물 목록입니다.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-24 text-gray-400 text-sm">등록된 매물이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <div key={deal.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{deal.industry} · {deal.region} · 희망가 {fmt(deal.asking_price)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[deal.status]}`}>
                  {STATUS_LABELS[deal.status]}
                </span>
              </div>

              {deal.status === 'rejected' && deal.admin_note && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  <span className="font-medium">반려 사유: </span>{deal.admin_note}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(deal.created_at).toLocaleDateString('ko-KR')} 등록</span>
                <div className="flex gap-2">
                  {deal.status === 'draft' && (
                    <button
                      disabled={updating === deal.id}
                      onClick={() => requestReview(deal.id)}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      검토 요청
                    </button>
                  )}
                  {deal.status === 'rejected' && (
                    <button
                      disabled={updating === deal.id}
                      onClick={() => requestReview(deal.id)}
                      className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      재제출
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
