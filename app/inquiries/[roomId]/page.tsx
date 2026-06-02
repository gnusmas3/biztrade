'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DealRoom, Message, MessageAttachment, NdaAgreement,
  ROOM_STATUS_LABELS, ROOM_STATUS_STYLES, ROOM_STATUS_STEPS,
} from '@/types/inquiry'

// ─── helpers ────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function isImage(mime: string | null) {
  return mime?.startsWith('image/') ?? false
}

// ─── Status Pipeline ─────────────────────────────────────────

function StatusPipeline({ status }: { status: DealRoom['status'] }) {
  const currentIdx = ROOM_STATUS_STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {ROOM_STATUS_STEPS.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${active ? 'bg-blue-600 text-white' : done ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
              {done && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                </svg>
              )}
              {ROOM_STATUS_LABELS[s]}
            </div>
            {i < ROOM_STATUS_STEPS.length - 1 && (
              <div className={`w-6 h-0.5 mx-0.5 ${i < currentIdx ? 'bg-blue-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── NDA Modal ────────────────────────────────────────────────

function NDAModal({
  roomId, buyerId, onSigned,
}: { roomId: string; buyerId: string; onSigned: () => void }) {
  const [form, setForm] = useState({ full_name: '', company_name: '', agreed: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sign = async () => {
    if (!form.full_name.trim()) { setError('성명을 입력해주세요.'); return }
    if (!form.agreed) { setError('비밀유지계약 내용에 동의해주세요.'); return }
    setLoading(true)
    setError('')

    const { error: ndaErr } = await supabase.from('nda_agreements').insert({
      room_id: roomId,
      buyer_id: buyerId,
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim() || null,
    })

    if (ndaErr) { setError('서명에 실패했습니다. 다시 시도해주세요.'); setLoading(false); return }

    await supabase.from('deal_rooms').update({
      status: 'nda_signed',
      nda_signed_at: new Date().toISOString(),
    }).eq('id', roomId)

    setLoading(false)
    onSigned()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-lg w-full">
        <div className="bg-indigo-600 rounded-t-2xl p-6 text-center">
          <svg className="w-10 h-10 text-white mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <h2 className="text-white text-xl font-bold mb-1">비밀유지계약 (NDA)</h2>
          <p className="text-indigo-200 text-sm">채팅 시작 전 NDA에 동의해주세요</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-b-2xl p-6 shadow-lg">
          {/* NDA 본문 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-xs text-gray-600 leading-relaxed max-h-48 overflow-y-auto border border-gray-200">
            <p className="font-semibold text-gray-800 mb-2">비밀유지계약서 (Non-Disclosure Agreement)</p>
            <p className="mb-2">본 계약은 BizTrade 플랫폼을 통해 제공되는 기업 매각 관련 정보의 비밀 유지를 목적으로 합니다.</p>
            <p className="mb-2"><strong>제1조 (비밀정보)</strong> 본 계약에서 "비밀정보"란 매각 대상 기업의 재무 현황, 고객 정보, 영업 비밀, 직원 정보 등 모든 비공개 정보를 의미합니다.</p>
            <p className="mb-2"><strong>제2조 (비밀 유지 의무)</strong> 귀하는 비밀정보를 제3자에게 공개하거나 본 거래의 검토 외 목적으로 사용할 수 없습니다.</p>
            <p className="mb-2"><strong>제3조 (유효기간)</strong> 본 계약의 비밀유지 의무는 서명일로부터 3년간 유효합니다.</p>
            <p className="mb-2"><strong>제4조 (위반 시 책임)</strong> 비밀정보 유출 시 관련 법령에 따라 민·형사상 책임을 질 수 있습니다.</p>
            <p><strong>제5조 (준거법)</strong> 본 계약은 대한민국 법률에 따릅니다.</p>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">성명 *</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">회사명 (선택)</label>
              <input
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="(주)예시컴퍼니"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={e => setForm(f => ({ ...f, agreed: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-indigo-600"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              위 비밀유지계약 내용을 충분히 읽었으며, 이에 동의합니다. 본 서명은 전자서명으로서 법적 효력을 가집니다.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>
          )}

          <button
            onClick={sign}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? '서명 중...' : 'NDA 서명 및 채팅 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────

function MessageBubble({
  msg, isMine, senderName, signedUrls,
}: {
  msg: Message
  isMine: boolean
  senderName: string
  signedUrls: Record<string, string>
}) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMine && (
          <span className="text-xs text-gray-500 mb-1 ml-1">{senderName}</span>
        )}
        {msg.content && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
            ${isMine
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
            }`}>
            {msg.content}
          </div>
        )}
        {msg.message_attachments?.map(att => (
          <div key={att.id} className={`mt-1 rounded-xl overflow-hidden border ${isMine ? 'border-blue-400' : 'border-gray-200'}`}>
            {isImage(att.mime_type) && signedUrls[att.file_path] ? (
              <a href={signedUrls[att.file_path]} target="_blank" rel="noopener noreferrer">
                <img
                  src={signedUrls[att.file_path]}
                  alt={att.file_name}
                  className="max-w-[240px] max-h-[180px] object-cover"
                />
              </a>
            ) : (
              <a
                href={signedUrls[att.file_path] ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium hover:opacity-80 transition-opacity
                  ${isMine ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-700'}`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <span className="truncate max-w-[160px]">{att.file_name}</span>
                <span className="opacity-60 flex-shrink-0">{fmtSize(att.file_size)}</span>
              </a>
            )}
          </div>
        ))}
        <span className="text-xs text-gray-400 mt-1 mx-1">{fmtTime(msg.created_at)}</span>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<DealRoom['status'], DealRoom['status']>> = {
  nda_signed:    'due_diligence',
  due_diligence: 'negotiation',
  negotiation:   'closed',
}

export default function InquiryRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [room, setRoom] = useState<DealRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ndaSigned, setNdaSigned] = useState(false)
  const [loading, setLoading] = useState(true)

  const [content, setContent] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  // ── signed URLs for attachments ──
  const loadSignedUrl = useCallback(async (path: string) => {
    if (signedUrls[path]) return
    const { data } = await supabase.storage
      .from('deal-attachments')
      .createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }))
    }
  }, [signedUrls])

  const loadSignedUrlsForMessages = useCallback(async (msgs: Message[]) => {
    for (const m of msgs) {
      for (const att of m.message_attachments ?? []) {
        await loadSignedUrl(att.file_path)
      }
    }
  }, [loadSignedUrl])

  // ── sender names ──
  const loadSenderNames = useCallback(async (senderIds: string[]) => {
    const missing = senderIds.filter(id => !senderNames[id])
    if (!missing.length) return
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', missing)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((p: { user_id: string; name: string | null; email: string | null }) => {
        map[p.user_id] = p.name || p.email || '알 수 없음'
      })
      setSenderNames(prev => ({ ...prev, ...map }))
    }
  }, [senderNames])

  // ── initial load ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (!uid) { router.replace(`/auth?redirect=/inquiries/${roomId}`); return }

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('user_id', uid).single()
      setIsAdmin(profile?.role === 'admin')

      // Load room with deal info
      const { data: roomData, error: roomErr } = await supabase
        .from('deal_rooms')
        .select('*, deals(id, title, industry, region, asking_price, seller_id)')
        .eq('id', roomId)
        .single()

      if (roomErr || !roomData) { router.replace('/my-inquiries'); return }
      setRoom(roomData as DealRoom)
      setNdaSigned(!!roomData.nda_signed_at)

      // Load messages with attachments
      const { data: msgData } = await supabase
        .from('messages')
        .select('*, message_attachments(*)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      const msgs = (msgData as Message[]) ?? []
      setMessages(msgs)

      const senderIds = Array.from(new Set(msgs.map(m => m.sender_id)))
      await loadSenderNames(senderIds)
      await loadSignedUrlsForMessages(msgs)

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // ── realtime subscription ──
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as Message
          // Load attachments for new message
          const { data: atts } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', newMsg.id)
          newMsg.message_attachments = (atts as MessageAttachment[]) ?? []
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          await loadSenderNames([newMsg.sender_id])
          for (const att of newMsg.message_attachments) {
            await loadSignedUrl(att.file_path)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deal_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(prev => prev ? { ...prev, ...(payload.new as DealRoom) } : null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadSenderNames, loadSignedUrl])

  // ── scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── send message ──
  const sendMessage = async () => {
    if (!content.trim() && pendingFiles.length === 0) return
    if (!userId || !room) return
    setSending(true)

    // Insert message
    const { data: msgData, error: msgErr } = await supabase
      .from('messages')
      .insert({ room_id: roomId, sender_id: userId, content: content.trim() || null })
      .select()
      .single()

    if (msgErr || !msgData) { setSending(false); return }

    const msg = msgData as Message
    msg.message_attachments = []

    // Upload files
    if (pendingFiles.length > 0) {
      setUploading(true)
      for (const file of pendingFiles) {
        const ext = file.name.split('.').pop()
        const filePath = `${roomId}/${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('deal-attachments')
          .upload(filePath, file, { contentType: file.type })

        if (!uploadErr) {
          const { data: attData } = await supabase
            .from('message_attachments')
            .insert({
              message_id: msg.id,
              room_id: roomId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: userId,
            })
            .select()
            .single()

          if (attData) {
            msg.message_attachments.push(attData as MessageAttachment)
            await loadSignedUrl(filePath)
          }
        }
      }
      setUploading(false)
    }

    setContent('')
    setPendingFiles([])

    // Auto-advance status: new → contacted
    if (room.status === 'new') {
      await supabase.from('deal_rooms').update({ status: 'contacted' }).eq('id', roomId)
      setRoom(prev => prev ? { ...prev, status: 'contacted' } : null)
    }

    setSending(false)
  }

  // ── advance status ──
  const advanceStatus = async (newStatus: DealRoom['status'], reason?: string) => {
    setStatusUpdating(true)
    const updates: Record<string, unknown> = { status: newStatus }
    if (reason) updates.closed_reason = reason
    await supabase.from('deal_rooms').update(updates).eq('id', roomId)
    setRoom(prev => prev ? { ...prev, status: newStatus, closed_reason: reason ?? null } : null)
    setStatusUpdating(false)
    setShowCloseModal(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPendingFiles(prev => [...prev, ...files].slice(0, 5))
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!room) return null

  const canAdvance = isAdmin || room.seller_id === userId
  const nextStatus = NEXT_STATUS[room.status]
  const isBuyer = room.buyer_id === userId

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 truncate text-sm">
                  {room.deals?.title ?? '매물'}
                </h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROOM_STATUS_STYLES[room.status]}`}>
                  {ROOM_STATUS_LABELS[room.status]}
                </span>
              </div>
              <p className="text-xs text-gray-500">{room.deals?.industry} · {room.deals?.region}</p>
            </div>
            {/* Status actions */}
            {canAdvance && room.status !== 'closed' && nextStatus && (
              room.status === 'negotiation' ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  거래 종료
                </button>
              ) : (
                <button
                  disabled={statusUpdating}
                  onClick={() => advanceStatus(nextStatus)}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {ROOM_STATUS_LABELS[nextStatus]} 전환
                </button>
              )
            )}
          </div>
          {/* Status pipeline */}
          <StatusPipeline status={room.status} />
        </div>
      </header>

      {/* NDA gate */}
      {isBuyer && !ndaSigned ? (
        <div className="flex-1 overflow-auto">
          <NDAModal
            roomId={roomId}
            buyerId={userId!}
            onSigned={() => { setNdaSigned(true); setRoom(prev => prev ? { ...prev, status: 'nda_signed' } : null) }}
          />
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-auto px-4 py-4">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <p className="text-sm">첫 메시지를 보내 대화를 시작하세요.</p>
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_id === userId}
                  senderName={senderNames[msg.sender_id] ?? '...'}
                  signedUrls={signedUrls}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input area */}
          {room.status !== 'closed' && (
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                {/* Pending files preview */}
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                        <span className="text-xs text-blue-700 max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => removeFile(i)} className="text-blue-400 hover:text-blue-600 ml-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* File attach */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0 mb-0.5"
                    title="파일 첨부"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.hwp"
                    onChange={handleFileSelect}
                  />
                  {/* Message input */}
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
                    className="flex-1 resize-none px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 max-h-32"
                    style={{ minHeight: '44px' }}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = 'auto'
                      t.style.height = Math.min(t.scrollHeight, 128) + 'px'
                    }}
                  />
                  {/* Send */}
                  <button
                    onClick={sendMessage}
                    disabled={sending || uploading || (!content.trim() && pendingFiles.length === 0)}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5 transition-colors"
                  >
                    {sending || uploading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">
                  파일 첨부 최대 5개 · PDF, Excel, Word, 이미지 (각 50MB 이하)
                </p>
              </div>
            </div>
          )}

          {/* Closed banner */}
          {room.status === 'closed' && (
            <div className="bg-gray-100 border-t border-gray-200 px-4 py-3 text-center flex-shrink-0">
              <p className="text-sm font-medium text-gray-600">이 거래방은 종료되었습니다.</p>
              {room.closed_reason && (
                <p className="text-xs text-gray-400 mt-0.5">사유: {room.closed_reason}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Close deal modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 text-lg mb-2">거래 종료</h3>
            <p className="text-gray-500 text-sm mb-4">거래 종료 사유를 입력해주세요.</p>
            <textarea
              rows={3}
              value={closeReason}
              onChange={e => setCloseReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-4"
              placeholder="예: 계약 체결 완료 / 가격 협의 결렬 / 기타"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={() => advanceStatus('closed', closeReason)}
                disabled={statusUpdating}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {statusUpdating ? '처리 중...' : '종료 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
