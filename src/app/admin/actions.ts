"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function crearCorreduria(input: {
  nombre: string
  adminEmail: string
  adminPassword: string
  adminNombre?: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin() // autoriza: solo super-admin

  const nombre = input.nombre.trim()
  const email = input.adminEmail.trim()
  if (!nombre) return { ok: false, error: "El nombre de la correduría es obligatorio." }
  if (!email || !input.adminPassword) {
    return { ok: false, error: "Email y contraseña del admin obligatorios." }
  }
  if (input.adminPassword.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }
  }

  const admin = createAdminClient()

  const { data: corr, error: e1 } = await admin
    .from("corredurias")
    .insert({ nombre })
    .select("id")
    .single()
  if (e1 || !corr) return { ok: false, error: "No se pudo crear la correduría." }

  const { data: created, error: e2 } = await admin.auth.admin.createUser({
    email,
    password: input.adminPassword,
    email_confirm: true,
  })
  if (e2 || !created.user) {
    await admin.from("corredurias").delete().eq("id", corr.id) // rollback
    return { ok: false, error: e2?.message ?? "No se pudo crear el usuario admin." }
  }

  const { error: e3 } = await admin.from("perfiles").upsert(
    {
      user_id: created.user.id,
      correduria_id: corr.id,
      rol: "admin",
      nombre_completo: input.adminNombre?.trim() || null,
      activo: true,
    },
    { onConflict: "user_id" }
  )
  if (e3) return { ok: false, error: "Correduría creada, pero falló el perfil del admin." }

  revalidatePath("/admin")
  return { ok: true }
}

export async function cambiarEstadoCorreduria(
  id: string,
  activa: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from("corredurias").update({ activa }).eq("id", id)
  if (error) return { ok: false, error: "No se pudo actualizar." }
  revalidatePath("/admin")
  return { ok: true }
}
