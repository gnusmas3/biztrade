'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  useEffect(() => {
    // Supabase가 URL hash의 토큰을 자동으로 처리함
    // 세션이 확인되면 원래 페이지로 이동
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(redirectTo)
      } else {
        // onAuthStateChange로 대기
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            router.replace(redirectTo)
          }
        })
      }
    }
    check()
  }, [router, redirectTo])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">카카오 로그인 처리 중...</p>
        <p className="text-gray-400 text-xs mt-1">잠시만 기다려주세요.</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
