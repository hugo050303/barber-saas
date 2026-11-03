import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js'

// Conexión a la base de datos en Neon (antes era Supabase).
// Usamos el adaptador compatible con Supabase para que el resto de la app
// (supabase.from(...), supabase.auth.signInWithPassword(...), etc.) siga igual.
const authUrl = import.meta.env.VITE_NEON_AUTH_URL
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL

export const supabase = createClient({
  auth: {
    adapter: SupabaseAuthAdapter(),
    url: authUrl,
    // Permite que la página pública de reservas funcione sin iniciar sesión.
    // Lo que puede hacer un visitante lo limitan los permisos en db/permisos.sql.
    allowAnonymous: true,
  },
  dataApi: {
    url: dataApiUrl,
  },
})
