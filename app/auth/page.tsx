'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // 이미 로그인 상태면 리다이렉트
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo)
    })
  }, [router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        router.replace(redirectTo)
      }
    } else {
      if (!name.trim()) { setError('이름을 입력해주세요.'); setLoading(false); return }
      if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); setLoading(false); return }

      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim(), role: 'buyer' } },
      })
      if (err) {
        setError(err.message === 'User already registered'
          ? '이미 가입된 이메일입니다. 로그인해주세요.'
          : '가입에 실패했습니다. 다시 시도해주세요.')
      } else {
        setDone(true)
      }
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">가입이 완료되었습니다</h3>
        <p className="text-gray-500 text-sm mb-1">이메일 인증 링크를 발송했습니다.</p>
        <p className="text-gray-400 text-xs mb-6">{email} 을 확인해주세요.</p>
        <button
          onClick={() => setMode('login')}
          className="btn-primary w-full"
        >
          로그인하기
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Tab */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setMode('login'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          로그인
        </button>
        <button
          onClick={() => { setMode('signup'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="input-field"
              placeholder="홍길동"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">이메일 *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder="email@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">비밀번호 *</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-field"
            placeholder={mode === 'signup' ? '6자 이상' : '••••••••'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50 mt-1"
        >
          {loading
            ? (mode === 'login' ? '로그인 중...' : '가입 중...')
            : (mode === 'login' ? '로그인' : '회원가입')}
        </button>
      </form>

      {mode === 'login' && (
        <p className="text-center text-xs text-gray-400 mt-4">
          아직 계정이 없으신가요?{' '}
          <button onClick={() => { setMode('signup'); setError('') }} className="text-blue-600 hover:underline font-medium">
            회원가입
          </button>
        </p>
      )}
    </>
  )
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L5 5L8 9L10 6L12 12H2Z" fill="white" />
              </svg>
            </span>
            <span className="font-bold text-gray-900 text-xl font-serif">BizTrade</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">기업 인수합병 플랫폼</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
            <AuthContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
