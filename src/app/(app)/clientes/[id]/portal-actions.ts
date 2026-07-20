"use server"

import { revalidatePath } from "next/cache"
import { requireCorreduria } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

/** Verifica que el cliente pertenece a la correduría del usuario actual. */
async function autorizarCliente(clienteId: string) {
  const ctx = await requireCorreduria()
  const { data } = await ctx.supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .maybeSingle()
  if (!data) throw new Error("Cliente no encontrado en tu correduría.")
  return ctx
}

export async function crearAccesoPortal(input: {
  clienteId: string
  email: string
  password: string
}): Promise<{ ok: boolean; error?: string }> {
  await autorizarCliente(input.clienteId)
  const email = input.email.trim()
  if (!email || !input.password) return { ok: false, error: "Email y contraseña obligatorios." }
  if (input.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }
  }

  const admin = createAdminClient()

  // Un solo acceso de portal por cliente.
  const { data: existe } = await admin
    .from("portal_accesos")
    .select("user_id")
    .eq("cliente_id", input.clienteId)
    .maybeSingle()
  if (existe) return { ok: false, error: "Este cliente ya tiene acceso al portal." }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (error || !created.user) {
    return { ok: false, error: error?.message ?? "No se pudo crear el acceso." }
  }

  const { error: e2 } = await admin.from("portal_accesos").insert({
    user_id: created.user.id,
    cliente_id: input.clienteId,
    activo: true,
  })
  if (e2) {
    await admin.auth.admin.deleteUser(created.user.id) // rollback
    return { ok: false, error: "No se pudo enlazar el acceso con el cliente." }
  }

  revalidatePath(`/clientes/${input.clienteId}`)
  return { ok: true }
}

export async function revocarAccesoPortal(input: {
  clienteId: string
  userId: string
}): Promise<{ ok: boolean; error?: string }> {
  await autorizarCliente(input.clienteId)
  const admin = createAdminClient()
  await admin.from("portal_accesos").delete().eq("user_id", input.userId)
  await admin.auth.admin.deleteUser(input.userId)
  revalidatePath(`/clientes/${input.clienteId}`)
  return { ok: true }
}
