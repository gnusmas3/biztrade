export type DealStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'sold'

export interface Deal {
  id: string
  title: string
  industry: string
  region: string
  founded_year?: number
  employee_count?: number
  annual_revenue?: number
  operating_profit?: number
  net_profit?: number
  asking_price?: number
  description?: string
  strengths?: string
  risks?: string
  reason_for_sale?: string
  contact_email?: string
  contact_phone?: string
  status: DealStatus
  seller_id?: string | null
  admin_note?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  sold_at?: string | null
  created_at: string
  updated_at?: string
}

export interface Inquiry {
  id: string
  deal_id: string
  name: string
  email: string
  phone?: string
  message?: string
  created_at: string
}
