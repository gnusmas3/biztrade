'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string; user_id: string; name: string | null; email: string | null
  role: string; user_type: string | null; status: string; created_at: string
}

const USER_TYPE_LABELS: Record<string, string> = { corporate: '기업회원', investor: '투자자' }
const STATUS_STYLES: Record<string, string> = { active: 'bg-green-100 text-green-700', suspended: 'bg-red-100 text-red-700' }
const STATUS_LABELS: Record<string, string> = { active: '활성', suspended: '정지' }
const ROLE_LABELS: Record<string, string> = { buyer: '구매자', seller: '판매자', admin: '관리자' }

export default function MembersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles((data as Profile[]) ?? []); setLoading(false) })
  }, [])

  const toggleStatus = async (profile: Profile) => {
    const newStatus = profile.status === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', profile.id)
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: newStatus } : p))
    if (selected?.id === profile.id) setSelected({ ...profile, status: newStatus })
  }

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterRole === 'all' || p.role === filterRole) && (filterStatus === 'all' || p.status === filterStatus)
  })

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" placeholder="이름 또는 이메일 검색" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">전체 역할</option><option value="buyer">구매자</option><option value="seller">판매자</option><option value="admin">관리자</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">전체 상태</option><option value="active">활성</option><option value="suspended">정지</option>
          </select>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">{loading ? '로딩 중…' : `총 ${filtered.length}명`}</span>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-48" /></div>
              </div>
            ))}</div>
          ) : filtered.length === 0 ? <div className="text-center py-16 text-gray-400 text-sm">회원이 없습니다.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">{['이름','이메일','구분','역할','상태','가입일','액션'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(profile => (
                    <tr key={profile.id} className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id === profile.id ? 'bg-blue-50' : ''}`} onClick={() => setSelected(profile)}>
                      <td className="px-5 py-3 font-medium text-gray-900">{profile.name || '-'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{profile.email || '-'}</td>
                      <td className="px-5 py-3 text-xs text-gray-600">{profile.user_type ? USER_TYPE_LABELS[profile.user_type] : '-'}</td>
                      <td className="px-5 py-3 text-xs text-gray-600">{ROLE_LABELS[profile.role] ?? profile.role}</td>
                      <td className="px-5 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[profile.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[profile.status] ?? profile.status}</span></td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(profile.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleStatus(profile)} className={`text-xs px-2 py-1 rounded font-medium ${profile.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {profile.status === 'active' ? '정지' : '활성화'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">회원 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-2xl font-bold mb-3">{selected.name?.[0]?.toUpperCase() ?? '?'}</div>
              <p className="font-semibold text-gray-900">{selected.name || '(이름 없음)'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selected.email || '-'}</p>
            </div>
            <div className="space-y-3">
              {[
                { label: '역할', value: ROLE_LABELS[selected.role] ?? selected.role },
                { label: '회원 구분', value: selected.user_type ? USER_TYPE_LABELS[selected.user_type] : '-' },
                { label: '상태', value: STATUS_LABELS[selected.status] ?? selected.status },
                { label: '가입일', value: new Date(selected.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="text-gray-900 text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => toggleStatus(selected)} className={`mt-4 w-full py-2 rounded-lg text-sm font-medium ${selected.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              {selected.status === 'active' ? '계정 정지' : '계정 활성화'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
