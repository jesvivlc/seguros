import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { PerfilRow, PortalAccesoRow } from "@/lib/database.types"

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
  if (!perfil) {
    // ¿Es un usuario del portal del cliente? Entonces su sitio es /portal.
    const { data: portal } = await supabase
      .from("portal_accesos")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle()
    redirect(portal ? "/portal" : "/login")
  }
  if (perfil.es_super_admin && !perfil.correduria_id) redirect("/admin")
  if (!perfil.correduria_id) redirect("/login")
  return { supabase, user, perfil }
}

/** Exige un usuario del portal del cliente (ligado a un cliente). */
export async function requirePortal() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from("portal_accesos")
    .select("*")
    .eq("user_id", user.id)
    .eq("activo", true)
    .maybeSingle()
  const acceso = (data as PortalAccesoRow) ?? null
  if (!acceso) redirect("/") // no es usuario-portal → la app decide a dónde
  return { supabase, user, acceso }
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
