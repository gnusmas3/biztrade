'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DealRoom, ROOM_STATUS_LABELS, ROOM_STATUS_STYLES } from '@/types/inquiry'

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

export default function MyInquiriesPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<DealRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (!uid) { setLoading(false); return }

      const { data } = await supabase
        .from('deal_rooms')
        .select(`
          *,
          deals (id, title, industry, region, asking_price)
        `)
        .eq('buyer_id', uid)
        .order('updated_at', { ascending: false })

      setRooms((data as DealRoom[]) ?? [])
      setLoading(false)
    }
    init()
  }, [])

  if (!loading && !userId) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-500 text-sm mb-4">로그인 후 이용하실 수 있습니다.</p>
        <button onClick={() => router.push('/admin/login')} className="btn-primary">
          로그인
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif mb-2">내 인수문의</h1>
        <p className="text-gray-500 text-sm">진행 중인 인수문의 현황입니다.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p className="text-sm font-medium">진행 중인 인수문의가 없습니다.</p>
          <p className="text-xs mt-1">관심 있는 매물에 인수문의를 시작해보세요.</p>
          <Link href="/deals" className="inline-block mt-5 btn-primary text-sm">
            매물 둘러보기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <Link
              key={room.id}
              href={`/inquiries/${room.id}`}
              className="card p-5 block hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {room.deals?.title ?? '매물'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {room.deals?.industry} · {room.deals?.region} · 희망가 {fmt(room.deals?.asking_price)}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${ROOM_STATUS_STYLES[room.status]}`}>
                  {ROOM_STATUS_LABELS[room.status]}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex gap-1 mb-3">
                {(['new','contacted','nda_signed','due_diligence','negotiation','closed'] as const).map((s, i, arr) => {
                  const currentIdx = arr.indexOf(room.status)
                  const done = i <= currentIdx
                  return (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${done ? 'bg-blue-500' : 'bg-gray-200'}`}
                    />
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {room.nda_signed_at
                    ? `NDA 체결: ${new Date(room.nda_signed_at).toLocaleDateString('ko-KR')}`
                    : 'NDA 미체결'}
                </span>
                <span>{new Date(room.updated_at).toLocaleDateString('ko-KR')} 업데이트</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
