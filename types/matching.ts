export interface UserInterest {
  id: string
  user_id: string
  industries: string[]
  regions: string[]
  min_price: number | null
  max_price: number | null
  min_ebitda: number | null
  max_ebitda: number | null
  notes: string | null
  embedded_at: string | null
  created_at: string
  updated_at: string
}

export interface DealMatch {
  id: string
  user_id: string
  deal_id: string
  similarity_score: number
  is_notified: boolean
  is_read: boolean
  created_at: string
  // joined
  deals?: {
    id: string
    title: string
    industry: string
    region: string
    annual_revenue: number | null
    operating_profit: number | null
    asking_price: number | null
    status: string
  }
}
