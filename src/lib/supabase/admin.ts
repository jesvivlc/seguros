import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

/**
 * Cliente con service_role: OMITE RLS. Usar SOLO en el servidor
 * (route handlers de cron, seeds, tareas administrativas). NUNCA en el cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Requerida para operaciones de administración."
    )
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
