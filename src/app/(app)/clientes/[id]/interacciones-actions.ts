"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { interaccionSchema } from "@/lib/schemas/interaccion"
import type { InteraccionRow } from "@/lib/database.types"

export interface InteraccionResult {
  ok: boolean
  interaccion?: InteraccionRow
  error?: string
}

export async function crearInteraccion(
  values: unknown
): Promise<InteraccionResult> {
  const parsed = interaccionSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }
  const data = parsed.data

  const { supabase, user } = await requireUser()
  const { data: row, error } = await supabase
    .from("interacciones")
    .insert({
      user_id: user.id,
      cliente_id: data.cliente_id,
      poliza_id: data.poliza_id ?? null,
      tipo: data.tipo,
      resumen: data.resumen,
      detalle: data.detalle ?? null,
      ...(data.fecha ? { fecha: data.fecha } : {}),
    })
    .select("*")
    .single()

  if (error) {
    return { ok: false, error: "No se pudo guardar la interacción." }
  }

  revalidatePath(`/clientes/${data.cliente_id}`)
  return { ok: true, interaccion: row as InteraccionRow }
}

export async function eliminarInteraccion(
  id: string,
  clienteId: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("interacciones").delete().eq("id", id)
  if (error) return { ok: false, error: "No se pudo eliminar." }
  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}
