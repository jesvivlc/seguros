import { requireUser } from "@/lib/auth"
import type { PerfilRow } from "@/lib/database.types"

export type Perfil = PerfilRow

/** Carga el perfil del usuario autenticado (o null si aún no tiene). */
export async function cargarPerfil(): Promise<Perfil | null> {
  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
  return (data as Perfil) ?? null
}
