"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { polizaSchema } from "@/lib/schemas/poliza"

export interface ActionResult {
  ok: boolean
  id?: string
  error?: string
  fieldErrors?: Record<string, string>
}

function parsePoliza(values: unknown) {
  const parsed = polizaSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "")
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }
  return { data: parsed.data }
}

export async function crearPoliza(values: unknown): Promise<ActionResult> {
  const { data, fieldErrors } = parsePoliza(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase, user } = await requireUser()
  const { data: row, error } = await supabase
    .from("polizas")
    .insert({ ...data, user_id: user.id })
    .select("id")
    .single()

  if (error) {
    return { ok: false, error: "No se pudo crear la póliza. Inténtalo de nuevo." }
  }

  revalidatePath("/polizas")
  revalidatePath(`/clientes/${data.cliente_id}`)
  return { ok: true, id: row.id }
}

export async function actualizarPoliza(
  id: string,
  values: unknown
): Promise<ActionResult> {
  const { data, fieldErrors } = parsePoliza(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase } = await requireUser()
  const { error } = await supabase.from("polizas").update(data).eq("id", id)

  if (error) {
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." }
  }

  revalidatePath("/polizas")
  revalidatePath(`/polizas/${id}`)
  revalidatePath(`/clientes/${data.cliente_id}`)
  return { ok: true, id }
}

export async function eliminarPoliza(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("polizas").delete().eq("id", id)

  if (error) {
    return { ok: false, error: "No se pudo eliminar la póliza." }
  }

  revalidatePath("/polizas")
  return { ok: true }
}
