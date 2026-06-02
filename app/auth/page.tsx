'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.612 5.076 4.07 6.522L5.1 21l4.574-2.95C10.39 18.34 11.184 18.5 12 18.5c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" fill="#3A1D1D"/>
    </svg>
  )
}

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // 이미 로그인 상태면 리다이렉트
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo)
    })
  }, [router, redirectTo])

  const handleKakaoLogin = async () => {
    setKakaoLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (err) {
      setError('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setKakaoLoading(false)
    }
    // 성공 시 카카오 로그인 페이지로 리다이렉트됨 (로딩 유지)
  }

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

      {/* 카카오 간편 로그인 */}
      <button
        onClick={handleKakaoLogin}
        disabled={kakaoLoading || loading}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#FEE500', color: '#191600' }}
      >
        {kakaoLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C6.477 3 2 6.75 2 11.25c0 2.872 1.71 5.4 4.328 6.938L5.25 21.75l4.863-3.137c.607.112 1.233.17 1.887.17 5.523 0 10-3.75 10-8.483S17.523 3 12 3z" fill="#191600"/>
          </svg>
        )}
        {kakaoLoading ? '카카오 연결 중...' : '카카오로 1초 로그인'}
      </button>

      {/* 구분선 */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">또는 이메일로</span>
        <div className="flex-1 h-px bg-gray-200" />
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
