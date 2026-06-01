import Link from 'next/link'
import { Deal } from '@/types'

function fmt(n?: number) {
  if (!n) return '미공개'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

const INDUSTRY_COLORS: Record<string, string> = {
  '카페/외식업': 'bg-amber-50 text-amber-700 border-amber-200',
  '제조업': 'bg-blue-50 text-blue-700 border-blue-200',
  '온라인 쇼핑몰': 'bg-purple-50 text-purple-700 border-purple-200',
  '유통업': 'bg-green-50 text-green-700 border-green-200',
  '학원/교육업': 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function DealCard({ deal }: { deal: Deal }) {
  const colorClass = INDUSTRY_COLORS[deal.industry] || 'bg-gray-50 text-gray-700 border-gray-200'

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full border ${colorClass} mb-2`}>
            {deal.industry}
          </span>
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{deal.title}</h3>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {deal.region}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{deal.description}</p>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">연매출</p>
          <p className="text-sm font-semibold text-gray-900">{fmt(deal.annual_revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">영업이익</p>
          <p className="text-sm font-semibold text-gray-900">{fmt(deal.operating_profit)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">희망가</p>
          <p className="text-sm font-semibold text-blue-700">{fmt(deal.asking_price)}</p>
        </div>
      </div>

      <Link
        href={`/deals/${deal.id}`}
        className="btn-secondary text-xs w-full mt-1"
      >
        상세 보기 →
      </Link>
    </div>
  )
}
