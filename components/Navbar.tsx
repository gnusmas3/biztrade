'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadMatches, setUnreadMatches] = useState(0)

  const fetchUnreadMatches = async (userId: string) => {
    const { count } = await supabase
      .from('deal_matches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setUnreadMatches(count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
      if (session?.user?.id) fetchUnreadMatches(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      if (session?.user?.id) fetchUnreadMatches(session.user.id)
      else setUnreadMatches(0)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setOpen(false)
  }

  const links = [
    { href: '/deals', label: '매물 목록' },
    { href: '/valuation', label: '가치평가' },
    { href: '/my-matches', label: 'AI 추천', badge: unreadMatches },
    { href: '/my-deals', label: '내 매물' },
    { href: '/my-inquiries', label: '내 인수문의' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12L5 5L8 9L10 6L12 12H2Z" fill="white" />
            </svg>
          </span>
          <span className="font-semibold text-gray-900 text-lg tracking-tight font-serif">BizTrade</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {l.label}
              {(l as { badge?: number }).badge ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {(l as { badge?: number }).badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          {userEmail ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 max-w-[140px] truncate">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/auth" className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              로그인
            </Link>
          )}
          <Link href="/sell" className="btn-primary text-xs px-4 py-2">
            + 매물 등록
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50"
          onClick={() => setOpen(!open)}
          aria-label="메뉴"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="relative px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              {l.label}
              {(l as { badge?: number }).badge ? (
                <span className="min-w-[18px] h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {(l as { badge?: number }).badge}
                </span>
              ) : null}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
            {userEmail ? (
              <>
                <p className="text-xs text-gray-400 px-3 py-1 truncate">{userEmail}</p>
                <button onClick={handleLogout} className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                  로그아웃
                </button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">
                로그인 / 회원가입
              </Link>
            )}
            <Link href="/sell" onClick={() => setOpen(false)} className="btn-primary mt-1 text-sm text-center">
              + 매물 등록
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
