import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { PerfilRow } from "@/lib/database.types"

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

/**
 * Exige un usuario con perfil de correduría. Redirige:
 * - a /admin si es super-admin sin correduría (su sitio es el panel),
 * - a /login si no tiene perfil válido.
 */
export async function requireCorreduria() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
  const perfil = (data as PerfilRow) ?? null
  if (!perfil) redirect("/login")
  if (perfil.es_super_admin && !perfil.correduria_id) redirect("/admin")
  if (!perfil.correduria_id) redirect("/login")
  return { supabase, user, perfil }
}

/** Exige super-admin de plataforma. Redirige a / si no lo es. */
export async function requireSuperAdmin() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
  const perfil = (data as PerfilRow) ?? null
  if (!perfil?.es_super_admin) redirect("/")
  return { supabase, user, perfil }
}
