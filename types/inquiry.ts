export type RoomStatus =
  | 'new'
  | 'contacted'
  | 'nda_signed'
  | 'due_diligence'
  | 'negotiation'
  | 'closed'

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  new:           '문의 시작',
  contacted:     '연락됨',
  nda_signed:    'NDA 체결',
  due_diligence: '실사 진행',
  negotiation:   '가격 협상',
  closed:        '거래 종료',
}

export const ROOM_STATUS_STYLES: Record<RoomStatus, string> = {
  new:           'bg-gray-100 text-gray-600',
  contacted:     'bg-blue-100 text-blue-700',
  nda_signed:    'bg-indigo-100 text-indigo-700',
  due_diligence: 'bg-yellow-100 text-yellow-700',
  negotiation:   'bg-orange-100 text-orange-700',
  closed:        'bg-green-100 text-green-700',
}

// Status pipeline order for progress display
export const ROOM_STATUS_STEPS: RoomStatus[] = [
  'new',
  'contacted',
  'nda_signed',
  'due_diligence',
  'negotiation',
  'closed',
]

export interface DealRoom {
  id: string
  deal_id: string
  buyer_id: string
  seller_id: string | null
  status: RoomStatus
  closed_reason: string | null
  nda_signed_at: string | null
  created_at: string
  updated_at: string
  // joined
  deals?: {
    id: string
    title: string
    industry: string
    region: string
    asking_price?: number | null
    seller_id?: string | null
  }
}

export interface NdaAgreement {
  id: string
  room_id: string
  buyer_id: string
  full_name: string
  company_name: string | null
  signed_at: string
  ip_address: string | null
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string | null
  created_at: string
  sender_name?: string
  message_attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  message_id: string | null
  room_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
}

export interface DealInterest {
  id: string
  user_id: string
  deal_id: string
  created_at: string
}
