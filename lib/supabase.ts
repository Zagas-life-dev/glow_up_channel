import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for interacting with your database
export const createServerSupabaseClient = () => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Create a client-side supabase client (with less privileges)
export const createBrowserSupabaseClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Singleton pattern for client-side to prevent multiple instances
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | undefined

export const getSupabaseBrowserClient = () => {
  if (browserClient) return browserClient
  browserClient = createBrowserSupabaseClient()
  return browserClient
}
