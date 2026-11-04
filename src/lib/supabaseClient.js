import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co'
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'placeholder-key'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Attenzione: Variabili d'ambiente VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti in .env!")
}

// Client Supabase principale con persistenza automatica della sessione
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Crea un client Supabase temporaneo con persistenza disabilitata.
 * Viene utilizzato dall'admin per registrare nuovi utenti senza disconnettersi.
 */
export const createTempClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
