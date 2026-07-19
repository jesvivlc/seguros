import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Devuelve el usuario autenticado o redirige a /login.
 * Usar en Server Components y Server Actions que requieren sesión.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }
  return { supabase, user }
}
