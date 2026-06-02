export interface Profile {
  id: string
  user_id: string
  name: string | null
  email: string | null
  role: 'buyer' | 'seller' | 'admin'
  user_type: 'corporate' | 'investor' | null
  status: 'active' | 'suspended'
  created_at: string
}

export interface InquiryWithDeal {
  id: string
  deal_id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  deals?: { title: string } | null
}
