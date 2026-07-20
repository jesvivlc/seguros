"use server"

import { revalidatePath } from "next/cache"
import { requireCorreduria } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Visibilidad, RolUsuario } from "@/lib/constants"

/** Exige que el llamante sea admin de una correduría. */
async function requireAdminCorreduria() {
  const ctx = await requireCorreduria()
  if (ctx.perfil.rol !== "admin") {
    throw new Error("Solo el administrador de la correduría puede hacer esto.")
  }
  return ctx
}

export async function crearAgente(input: {
  email: string
  password: string
  nombre?: string
  rol: RolUsuario
}): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAdminCorreduria()
  const email = input.email.trim()
  if (!email || !input.password) return { ok: false, error: "Email y contraseña obligatorios." }
  if (input.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (error || !created.user) {
    return { ok: false, error: error?.message ?? "No se pudo crear el usuario." }
  }

  const { error: e2 } = await admin.from("perfiles").upsert(
    {
      user_id: created.user.id,
      correduria_id: perfil.correduria_id,
      rol: input.rol,
      nombre_completo: input.nombre?.trim() || null,
      activo: true,
    },
    { onConflict: "user_id" }
  )
  if (e2) return { ok: false, error: "Usuario creado, pero falló su perfil." }

  revalidatePath("/equipo")
  return { ok: true }
}

export async function cambiarVisibilidad(
  v: Visibilidad
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, perfil } = await requireAdminCorreduria()
  const { error } = await supabase
    .from("corredurias")
    .update({ visibilidad: v })
    .eq("id", perfil.correduria_id!)
  if (error) return { ok: false, error: "No se pudo cambiar la visibilidad." }
  revalidatePath("/equipo")
  revalidatePath("/")
  return { ok: true }
}

export async function cambiarEstadoUsuario(
  userId: string,
  activo: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, perfil, user } = await requireAdminCorreduria()
  if (userId === user.id) {
    return { ok: false, error: "No puedes desactivarte a ti mismo." }
  }
  const { error } = await supabase
    .from("perfiles")
    .update({ activo })
    .eq("user_id", userId)
    .eq("correduria_id", perfil.correduria_id!)
  if (error) return { ok: false, error: "No se pudo actualizar." }
  revalidatePath("/equipo")
  return { ok: true }
}
