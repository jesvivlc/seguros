"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import type { DocumentoRow } from "@/lib/database.types"
import type { CategoriaDocumento } from "@/lib/constants"

const BUCKET = "documentos"
/** Duración de las signed URLs de descarga (segundos). Corta a propósito. */
const URL_TTL = 60

export interface RegistrarInput {
  cliente_id: string
  categoria: CategoriaDocumento
  nombre: string
  storage_path: string
  mime_type?: string | null
  tamano_bytes?: number | null
}

/**
 * Registra en BD un documento ya subido a Storage por el cliente.
 * El archivo se sube desde el navegador (RLS de Storage exige que la ruta
 * empiece por el uid); aquí solo se persiste la fila y se valida la ruta.
 */
export async function registrarDocumento(
  input: RegistrarInput
): Promise<{ ok: boolean; documento?: DocumentoRow; error?: string }> {
  const { supabase, user } = await requireUser()

  // Defensa en profundidad: la ruta debe pertenecer a la carpeta del usuario.
  if (!input.storage_path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Ruta de almacenamiento no válida." }
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      user_id: user.id,
      cliente_id: input.cliente_id,
      categoria: input.categoria,
      nombre: input.nombre,
      storage_path: input.storage_path,
      mime_type: input.mime_type ?? null,
      tamano_bytes: input.tamano_bytes ?? null,
    })
    .select("*")
    .single()

  if (error) return { ok: false, error: "No se pudo registrar el documento." }
  revalidatePath(`/clientes/${input.cliente_id}`)
  return { ok: true, documento: data as DocumentoRow }
}

/**
 * Genera una signed URL de corta duración (60 s) para descargar un documento.
 * NUNCA se exponen URLs públicas del bucket (que además es privado).
 */
export async function getUrlDescarga(
  storagePath: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, URL_TTL)
  if (error || !data) return { ok: false, error: "No se pudo generar el enlace." }
  return { ok: true, url: data.signedUrl }
}

/** Borra el objeto de Storage y su fila en BD. */
export async function eliminarDocumento(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser()

  const { data: row } = await supabase
    .from("documentos")
    .select("storage_path, cliente_id")
    .eq("id", id)
    .single()

  if (row?.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path])
  }

  const { error } = await supabase.from("documentos").delete().eq("id", id)
  if (error) return { ok: false, error: "No se pudo eliminar el documento." }

  if (row?.cliente_id) revalidatePath(`/clientes/${row.cliente_id}`)
  return { ok: true }
}
