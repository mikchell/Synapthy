import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // ログイン後のリダイレクトでトークンそのものをURLに載せない（認可コードだけを受け取り、ブラウザ内で交換する）
  auth: { flowType: 'pkce' },
})
