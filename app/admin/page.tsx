'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Deal, Inquiry } from '@/types'

interface Stats { totalMembers: number; totalDeals: number; pendingDeals: number; todaySignups: number }

function StatCard({ label, value, sub, color, href }: { label: string; value: number; sub?: string; color: string; href?: string }) {
  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function fmt(n?: number | null) {
  if (!n) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  return `${(n / 10000).toFixed(0)}만`
}

const STATUS_STYLES: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
const STATUS_LABELS: Record<string, string> = { pending: '승인대기', approved: '승인', rejected: '반려' }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, totalDeals: 0, pendingDeals: 0, todaySignups: 0 })
  const [recentDeals, setRecentDeals] = useState<Deal[]>([])
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const [{ count: totalMembers }, { count: totalDeals }, { count: pendingDeals }, { count: todaySignups }, { data: deals }, { data: inquiries }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ totalMembers: totalMembers ?? 0, totalDeals: totalDeals ?? 0, pendingDeals: pendingDeals ?? 0, todaySignups: todaySignups ?? 0 })
      setRecentDeals((deals as Deal[]) ?? [])
      setRecentInquiries((inquiries as Inquiry[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}</div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 회원수" value={stats.totalMembers} color="text-gray-900" href="/admin/members" />
        <StatCard label="총 매물수" value={stats.totalDeals} color="text-blue-700" href="/admin/deals" />
        <StatCard label="승인 대기" value={stats.pendingDeals} color={stats.pendingDeals > 0 ? 'text-yellow-600' : 'text-gray-400'} sub={stats.pendingDeals > 0 ? '검토가 필요합니다' : undefined} href="/admin/deals?status=pending" />
        <StatCard label="오늘 가입자" value={stats.todaySignups} color="text-green-700" href="/admin/members" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">최근 등록 매물</h2>
          <Link href="/admin/deals" className="text-xs text-blue-600 hover:text-blue-800">전체 보기 →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">{['기업명','업종','희망가','상태','등록일'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>
              {recentDeals.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">등록된 매물이 없습니다.</td></tr>
              : recentDeals.map(deal => (
                <tr key={deal.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-48 truncate">{deal.title}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{deal.industry}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{fmt(deal.asking_price)}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[deal.status]}`}>{STATUS_LABELS[deal.status]}</span></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(deal.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">최근 문의</h2>
          <Link href="/admin/inquiries" className="text-xs text-blue-600 hover:text-blue-800">전체 보기 →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentInquiries.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">문의가 없습니다.</div>
          : recentInquiries.map(inq => (
            <div key={inq.id} className="px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">{inq.name?.[0] ?? '?'}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{inq.name}</p>
                <p className="text-xs text-gray-400 truncate">{inq.message || '(내용 없음)'}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">{new Date(inq.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
