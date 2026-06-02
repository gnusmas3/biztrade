import OpenAI from 'openai'
import { Deal } from '@/types'
import { UserInterest } from '@/types/matching'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ─── 임베딩 생성 ────────────────────────────────────────────

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // 토큰 한도 안전 처리
  })
  return response.data[0].embedding
}

// ─── Deal → 임베딩용 텍스트 ────────────────────────────────

export function dealToText(deal: Deal): string {
  const fmt = (n?: number | null) => {
    if (!n) return null
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
    return `${(n / 10000).toFixed(0)}만원`
  }

  const lines: string[] = [
    '기업 매각 정보:',
    `업종: ${deal.industry}`,
    `지역: ${deal.region}`,
  ]

  if (deal.founded_year)    lines.push(`설립연도: ${deal.founded_year}년`)
  if (deal.employee_count)  lines.push(`직원수: ${deal.employee_count}명`)
  if (deal.annual_revenue)  lines.push(`연매출: ${fmt(deal.annual_revenue)}`)
  if (deal.operating_profit) {
    lines.push(`영업이익(EBITDA 근사): ${fmt(deal.operating_profit)}`)
  }
  if (deal.net_profit)      lines.push(`순이익: ${fmt(deal.net_profit)}`)
  if (deal.asking_price)    lines.push(`희망 매각가: ${fmt(deal.asking_price)}`)
  if (deal.description)     lines.push(`사업 설명: ${deal.description}`)
  if (deal.strengths)       lines.push(`강점: ${deal.strengths}`)
  if (deal.risks)           lines.push(`리스크: ${deal.risks}`)
  if (deal.reason_for_sale) lines.push(`매각 사유: ${deal.reason_for_sale}`)

  return lines.join('\n')
}

// ─── UserInterest → 임베딩용 텍스트 ─────────────────────────

export function interestToText(interest: UserInterest): string {
  const fmt = (n?: number | null) => {
    if (!n) return null
    if (n >= 100000000) return `${(n / 100000000).toFixed(0)}억원`
    return `${(n / 10000).toFixed(0)}만원`
  }

  const lines: string[] = ['투자자 인수 관심사 및 조건:']

  if (interest.industries?.length) {
    lines.push(`관심 업종: ${interest.industries.join(', ')}`)
  }
  if (interest.regions?.length) {
    lines.push(`관심 지역: ${interest.regions.join(', ')}`)
  }

  const minP = fmt(interest.min_price)
  const maxP = fmt(interest.max_price)
  if (minP || maxP) {
    lines.push(`희망 인수가격 범위: ${minP ?? '제한없음'} ~ ${maxP ?? '제한없음'}`)
  }

  const minE = fmt(interest.min_ebitda)
  const maxE = fmt(interest.max_ebitda)
  if (minE) lines.push(`최소 EBITDA: ${minE} 이상`)
  if (maxE) lines.push(`최대 EBITDA: ${maxE} 이하`)

  if (interest.notes) lines.push(`추가 조건 및 선호사항: ${interest.notes}`)

  return lines.join('\n')
}

// ─── 매칭 점수 라벨 ──────────────────────────────────────────

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 0.80) return { label: '매우 높음', color: 'bg-green-100 text-green-700' }
  if (score >= 0.65) return { label: '높음',    color: 'bg-blue-100 text-blue-700' }
  return               { label: '보통',    color: 'bg-gray-100 text-gray-600' }
}
