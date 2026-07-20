"use server"

import { revalidatePath } from "next/cache"
import { addDays, format, parseISO } from "date-fns"
import { requireUser } from "@/lib/auth"
import { tareaSchema } from "@/lib/schemas/tarea"
import type { TareaRow } from "@/lib/database.types"

export interface TareaResult {
  ok: boolean
  tarea?: TareaRow
  error?: string
}

function revalidar(clienteId?: string | null) {
  revalidatePath("/")
  revalidatePath("/agenda")
  if (clienteId) revalidatePath(`/clientes/${clienteId}`)
}

export async function crearTarea(values: unknown): Promise<TareaResult> {
  const parsed = tareaSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }
  const data = parsed.data

  const { supabase, user } = await requireUser()
  const { data: row, error } = await supabase
    .from("tareas")
    .insert({
      user_id: user.id,
      cliente_id: data.cliente_id ?? null,
      poliza_id: data.poliza_id ?? null,
      tipo: data.tipo,
      titulo: data.titulo,
      descripcion: data.descripcion ?? null,
      fecha_vencimiento: data.fecha_vencimiento,
      hora: data.hora ?? null,
      estado: "pendiente",
    })
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo crear la tarea." }
  revalidar(data.cliente_id)
  return { ok: true, tarea: row as TareaRow }
}

export async function completarTarea(id: string): Promise<TareaResult> {
  const { supabase } = await requireUser()
  const { data: row, error } = await supabase
    .from("tareas")
    .update({ estado: "completada", completada_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo completar la tarea." }
  revalidar((row as TareaRow).cliente_id)
  return { ok: true, tarea: row as TareaRow }
}

export async function reabrirTarea(id: string): Promise<TareaResult> {
  const { supabase } = await requireUser()
  const { data: row, error } = await supabase
    .from("tareas")
    .update({ estado: "pendiente", completada_at: null })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo reabrir la tarea." }
  revalidar((row as TareaRow).cliente_id)
  return { ok: true, tarea: row as TareaRow }
}

/** Pospone la tarea sumando `dias` a su fecha de vencimiento (queda pendiente). */
export async function posponerTarea(
  id: string,
  dias: number
): Promise<TareaResult> {
  const { supabase } = await requireUser()
  const { data: actual, error: e1 } = await supabase
    .from("tareas")
    .select("fecha_vencimiento, cliente_id")
    .eq("id", id)
    .single()
  if (e1 || !actual) return { ok: false, error: "No se encontró la tarea." }

  // Aritmética de fecha-solo tz-segura: parseISO da medianoche local y
  // format 'yyyy-MM-dd' no depende de la zona horaria del servidor.
  const nueva = format(addDays(parseISO(actual.fecha_vencimiento), dias), "yyyy-MM-dd")
  const { data: row, error } = await supabase
    .from("tareas")
    .update({ fecha_vencimiento: nueva, estado: "pospuesta" })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo posponer la tarea." }
  revalidar((row as TareaRow).cliente_id)
  return { ok: true, tarea: row as TareaRow }
}

export async function eliminarTarea(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser()
  const { data: row } = await supabase
    .from("tareas")
    .select("cliente_id")
    .eq("id", id)
    .single()
  const { error } = await supabase.from("tareas").delete().eq("id", id)
  if (error) return { ok: false, error: "No se pudo eliminar la tarea." }
  revalidar(row?.cliente_id ?? null)
  return { ok: true }
}
