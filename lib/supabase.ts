import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key (first 20):', supabaseKey?.slice(0, 20) + '...')
  console.log('Supabase Key role:', JSON.parse(atob(supabaseKey?.split('.')[1] ?? '{}')).role)
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)