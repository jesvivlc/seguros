import { redirect } from "next/navigation"
import { requireCorreduria } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { PageHeader } from "@/components/layout/page-header"
import type { CorreduriaRow, PerfilRow } from "@/lib/database.types"
import { EquipoClient, type MiembroEquipo } from "./equipo-client"

export const dynamic = "force-dynamic"

export default async function EquipoPage() {
  const { supabase, perfil, user } = await requireCorreduria()
  if (perfil.rol !== "admin") redirect("/")

  // Correduría (para la visibilidad actual) y perfiles del equipo (vía RLS).
  const [{ data: corrData }, { data: perfilesData }] = await Promise.all([
    supabase.from("corredurias").select("*").eq("id", perfil.correduria_id!).maybeSingle(),
    supabase
      .from("perfiles")
      .select("*")
      .eq("correduria_id", perfil.correduria_id!)
      .order("created_at", { ascending: true }),
  ])
  const correduria = corrData as CorreduriaRow | null
  const perfiles = (perfilesData ?? []) as PerfilRow[]

  // Emails: sólo obtenibles con service_role; se cruzan por id y se exponen
  // únicamente los de esta correduría.
  const admin = createAdminClient()
  const { data: authList } = await admin.auth.admin.listUsers()
  const emailPorId = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]))

  const miembros: MiembroEquipo[] = perfiles.map((p) => ({
    userId: p.user_id,
    email: emailPorId.get(p.user_id) ?? "—",
    nombre: p.nombre_completo,
    rol: p.rol,
    activo: p.activo,
    esYo: p.user_id === user.id,
  }))

  return (
    <>
      <PageHeader
        title="Equipo"
        description={correduria?.nombre ?? "Gestión de usuarios y visibilidad"}
      />
      <EquipoClient
        visibilidad={correduria?.visibilidad ?? "compartida"}
        miembros={miembros}
      />
    </>
  )
}
