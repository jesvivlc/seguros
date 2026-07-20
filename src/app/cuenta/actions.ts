"use server"

import { requireUser } from "@/lib/auth"

export async function cambiarPassword(
  nueva: string
): Promise<{ ok: boolean; error?: string }> {
  if (!nueva || nueva.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }
  }
  const { supabase } = await requireUser()
  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) return { ok: false, error: "No se pudo cambiar la contraseña." }
  return { ok: true }
}
