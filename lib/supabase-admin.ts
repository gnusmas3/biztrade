import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 서버 사이드 전용 — RLS 우회, API Route에서만 사용
let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _client
}

// Convenience alias — lazy, so safe at module load time without env vars
export const supabaseAdmin = {
  get from() { return getSupabaseAdmin().from.bind(getSupabaseAdmin()) },
  get rpc()  { return getSupabaseAdmin().rpc.bind(getSupabaseAdmin())  },
  get auth() { return getSupabaseAdmin().auth },
  get storage() { return getSupabaseAdmin().storage },
}
