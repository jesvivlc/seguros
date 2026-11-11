"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireCorreduria } from "@/lib/auth"
import { guardarComparativaSchema } from "@/lib/schemas/comparativa"

export interface ComparativaResult {
  ok: boolean
  id?: string
  error?: string
}

export async function guardarComparativa(values: unknown): Promise<ComparativaResult> {
  const parsed = guardarComparativaSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." }
  }
  const { supabase, user } = await requireCorreduria()
  const { titulo, cliente_id, datos } = parsed.data

  // La RLS (con check) también impide enlazar un cliente que no es visible.
  const { data, error } = await supabase
    .from("comparativas")
    .insert({ user_id: user.id, titulo, cliente_id, datos })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: "No se pudo guardar la comparativa." }
  revalidatePath("/comparador/guardadas")
  if (cliente_id) revalidatePath(`/clientes/${cliente_id}`)
  return { ok: true, id: data.id }
}

export async function eliminarComparativa(id: string): Promise<ComparativaResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Id no válido." }
  const { supabase } = await requireCorreduria()
  const { error } = await supabase.from("comparativas").delete().eq("id", id)
  if (error) return { ok: false, error: "No se pudo eliminar." }
  revalidatePath("/comparador/guardadas")
  return { ok: true }
}
