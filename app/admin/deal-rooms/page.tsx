'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DealRoom, RoomStatus,
  ROOM_STATUS_LABELS, ROOM_STATUS_STYLES, ROOM_STATUS_STEPS,
} from '@/types/inquiry'

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

interface RoomWithMeta extends DealRoom {
  buyer_email?: string | null
  buyer_name?: string | null
  message_count?: number
}

const NEXT_STATUS: Partial<Record<RoomStatus, RoomStatus>> = {
  new:           'contacted',
  contacted:     'nda_signed',
  nda_signed:    'due_diligence',
  due_diligence: 'negotiation',
  negotiation:   'closed',
}

export default function AdminDealRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | RoomStatus>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RoomWithMeta | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<string | null>(null)
  const [closeReason, setCloseReason] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: roomData } = await supabase
        .from('deal_rooms')
        .select('*, deals(id, title, industry, region, asking_price)')
        .order('updated_at', { ascending: false })

      if (!roomData) { setLoading(false); return }

      // Enrich with buyer profiles and message counts
      const buyerIds = [...new Set((roomData as DealRoom[]).map(r => r.buyer_id))]
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', buyerIds)

      const profileMap: Record<string, { name: string | null; email: string | null }> = {}
      profileData?.forEach((p: { user_id: string; name: string | null; email: string | null }) => {
        profileMap[p.user_id] = { name: p.name, email: p.email }
      })

      const enriched: RoomWithMeta[] = (roomData as DealRoom[]).map(r => ({
        ...r,
        buyer_name:  profileMap[r.buyer_id]?.name  ?? null,
        buyer_email: profileMap[r.buyer_id]?.email ?? null,
      }))

      setRooms(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (id: string, status: RoomStatus, extra?: { closed_reason?: string }) => {
    setUpdating(id)
    const updates: Record<string, unknown> = { status, ...extra }
    if (status === 'nda_signed') updates.nda_signed_at = new Date().toISOString()
    await supabase.from('deal_rooms').update(updates).eq('id', id)
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, ...extra } : null)
    setUpdating(null)
    setCloseTarget(null)
    setCloseReason('')
  }

  const filtered = rooms.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q
      || r.deals?.title?.toLowerCase().includes(q)
      || r.deals?.industry?.toLowerCase().includes(q)
      || (r.buyer_name ?? '').toLowerCase().includes(q)
      || (r.buyer_email ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts: Record<string, number> = { all: rooms.length }
  ROOM_STATUS_STEPS.forEach(s => { counts[s] = rooms.filter(r => r.status === s).length })

  const tabs = [
    { key: 'all', label: `전체 (${counts.all})` },
    ...ROOM_STATUS_STEPS.map(s => ({ key: s, label: `${ROOM_STATUS_LABELS[s]} (${counts[s]})` })),
  ]

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1 flex-wrap">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key as 'all' | RoomStatus)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap
                ${filterStatus === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <input type="text" placeholder="매물명, 업종, 바이어 이름/이메일 검색" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-40" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">해당 거래방이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['매물명','업종','바이어','진행 단계','업데이트','액션'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(room => (
                    <tr key={room.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id === room.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelected(room)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-40 truncate">
                        {room.deals?.title ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{room.deals?.industry ?? '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-gray-900 font-medium">{room.buyer_name ?? '-'}</p>
                        <p className="text-gray-400">{room.buyer_email ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {/* Mini progress */}
                        <div className="flex items-center gap-0.5 mb-1">
                          {ROOM_STATUS_STEPS.map((s, i) => {
                            const currentIdx = ROOM_STATUS_STEPS.indexOf(room.status)
                            return (
                              <div key={s} className={`h-1.5 w-4 rounded-full ${i <= currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
                            )
                          })}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROOM_STATUS_STYLES[room.status]}`}>
                          {ROOM_STATUS_LABELS[room.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(room.updated_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {/* Open chat */}
                          <button
                            onClick={() => router.push(`/inquiries/${room.id}`)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            채팅
                          </button>
                          {/* Advance status */}
                          {room.status !== 'closed' && NEXT_STATUS[room.status] && (
                            room.status === 'negotiation' ? (
                              <button
                                disabled={updating === room.id}
                                onClick={() => { setCloseTarget(room.id); setCloseReason('') }}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                              >
                                종료
                              </button>
                            ) : (
                              <button
                                disabled={updating === room.id}
                                onClick={() => updateStatus(room.id, NEXT_STATUS[room.status]!)}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                              >
                                {ROOM_STATUS_LABELS[NEXT_STATUS[room.status]!]} →
                              </button>
                            )
                          )}
                        </div>
                        {/* Close form */}
                        {closeTarget === room.id && (
                          <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
                            <input
                              value={closeReason}
                              onChange={e => setCloseReason(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none"
                              placeholder="종료 사유"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateStatus(room.id, 'closed', { closed_reason: closeReason })}
                                disabled={updating === room.id}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                확인
                              </button>
                              <button onClick={() => setCloseTarget(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                                취소
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-0 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">거래방 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-base mb-1">{selected.deals?.title ?? '-'}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROOM_STATUS_STYLES[selected.status]}`}>
                {ROOM_STATUS_LABELS[selected.status]}
              </span>
            </div>

            {/* Status pipeline */}
            <div className="mb-5">
              {ROOM_STATUS_STEPS.map((s, i) => {
                const currentIdx = ROOM_STATUS_STEPS.indexOf(selected.status)
                const done = i < currentIdx
                const active = i === currentIdx
                return (
                  <div key={s} className="flex items-center gap-2 mb-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                      ${active ? 'bg-blue-600 text-white' : done ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs ${active ? 'font-semibold text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                      {ROOM_STATUS_LABELS[s]}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 text-xs mb-5">
              {[
                { label: '매물', value: selected.deals?.title ?? '-' },
                { label: '업종', value: selected.deals?.industry ?? '-' },
                { label: '지역', value: selected.deals?.region ?? '-' },
                { label: '희망가', value: fmt(selected.deals?.asking_price) },
                { label: '바이어', value: selected.buyer_name ?? '-' },
                { label: '이메일', value: selected.buyer_email ?? '-' },
                { label: 'NDA', value: selected.nda_signed_at ? new Date(selected.nda_signed_at).toLocaleDateString('ko-KR') : '미체결' },
                { label: '시작일', value: new Date(selected.created_at).toLocaleDateString('ko-KR') },
                { label: '업데이트', value: new Date(selected.updated_at).toLocaleDateString('ko-KR') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 gap-2">
                  <span className="text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-gray-900 font-medium text-right break-all">{value}</span>
                </div>
              ))}
              {selected.closed_reason && (
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-gray-500 mb-1">종료 사유</p>
                  <p className="text-gray-800">{selected.closed_reason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/inquiries/${selected.id}`)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
              >
                채팅 보기
              </button>
              {selected.status !== 'closed' && NEXT_STATUS[selected.status] && (
                selected.status === 'negotiation' ? (
                  <button
                    disabled={updating === selected.id}
                    onClick={() => { setCloseTarget(selected.id); setCloseReason('') }}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    거래 종료
                  </button>
                ) : (
                  <button
                    disabled={updating === selected.id}
                    onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status]!)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {ROOM_STATUS_LABELS[NEXT_STATUS[selected.status]!]} 전환
                  </button>
                )
              )}
            </div>
            {/* Close form in panel */}
            {closeTarget === selected.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={2}
                  value={closeReason}
                  onChange={e => setCloseReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  placeholder="종료 사유 (예: 계약 체결 완료)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, 'closed', { closed_reason: closeReason })}
                    disabled={updating === selected.id}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    종료 확정
                  </button>
                  <button onClick={() => setCloseTarget(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
