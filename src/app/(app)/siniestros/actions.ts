"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { siniestroSchema } from "@/lib/schemas/siniestro"
import type { SiniestroRow } from "@/lib/database.types"
import type { EstadoSiniestro } from "@/lib/constants"

export interface SiniestroResult {
  ok: boolean
  siniestro?: SiniestroRow
  error?: string
  fieldErrors?: Record<string, string>
}

function parse(values: unknown) {
  const parsed = siniestroSchema.safeParse(values)
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

function revalidar(clienteId: string) {
  revalidatePath("/siniestros")
  revalidatePath(`/clientes/${clienteId}`)
}

export async function crearSiniestro(values: unknown): Promise<SiniestroResult> {
  const { data, fieldErrors } = parse(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase, user } = await requireUser()
  const { data: row, error } = await supabase
    .from("siniestros")
    .insert({
      user_id: user.id,
      cliente_id: data.cliente_id,
      poliza_id: data.poliza_id,
      numero_siniestro: data.numero_siniestro ?? null,
      tipo: data.tipo,
      estado: data.estado,
      fecha_ocurrencia: data.fecha_ocurrencia ?? null,
      fecha_apertura: data.fecha_apertura ?? undefined,
      descripcion: data.descripcion ?? null,
      importe_estimado: data.importe_estimado ?? null,
      importe_indemnizado: data.importe_indemnizado ?? null,
      observaciones: data.observaciones ?? null,
    })
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo crear el siniestro." }
  revalidar(data.cliente_id)
  return { ok: true, siniestro: row as SiniestroRow }
}

export async function actualizarSiniestro(
  id: string,
  values: unknown
): Promise<SiniestroResult> {
  const { data, fieldErrors } = parse(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase } = await requireUser()
  const { data: row, error } = await supabase
    .from("siniestros")
    .update({
      poliza_id: data.poliza_id,
      numero_siniestro: data.numero_siniestro ?? null,
      tipo: data.tipo,
      estado: data.estado,
      fecha_ocurrencia: data.fecha_ocurrencia ?? null,
      fecha_apertura: data.fecha_apertura ?? undefined,
      descripcion: data.descripcion ?? null,
      importe_estimado: data.importe_estimado ?? null,
      importe_indemnizado: data.importe_indemnizado ?? null,
      observaciones: data.observaciones ?? null,
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo guardar el siniestro." }
  revalidar(data.cliente_id)
  return { ok: true, siniestro: row as SiniestroRow }
}

/** Cambio rápido de estado desde la lista. */
export async function cambiarEstadoSiniestro(
  id: string,
  estado: EstadoSiniestro
): Promise<SiniestroResult> {
  const { supabase } = await requireUser()
  const { data: row, error } = await supabase
    .from("siniestros")
    .update({ estado })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo actualizar el estado." }
  revalidar((row as SiniestroRow).cliente_id)
  return { ok: true, siniestro: row as SiniestroRow }
}

export async function eliminarSiniestro(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser()
  const { data: row } = await supabase
    .from("siniestros")
    .select("cliente_id")
    .eq("id", id)
    .single()
  const { error } = await supabase.from("siniestros").delete().eq("id", id)
  if (error) return { ok: false, error: "No se pudo eliminar el siniestro." }
  if (row?.cliente_id) revalidar(row.cliente_id)
  return { ok: true }
}
