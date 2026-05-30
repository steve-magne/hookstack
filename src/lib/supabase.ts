import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseEnabled = supabase !== null

export async function signInWithGitHub() {
  if (!supabase) throw new Error('Supabase non configuré (voir .env.example).')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '' },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
