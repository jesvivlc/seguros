"use server"

import { revalidatePath } from "next/cache"
import { requirePortal } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

/** Signed URL (60 s) para un documento, solo si pertenece al cliente del portal. */
export async function getUrlDescargaPortal(
  storagePath: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { supabase, acceso } = await requirePortal()

  // Defensa en profundidad: ruta {correduria}/{cliente}/{archivo}.
  const partes = storagePath.split("/")
  if (partes[1] !== acceso.cliente_id) {
    return { ok: false, error: "No autorizado." }
  }

  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 60)
  if (error || !data) return { ok: false, error: "No se pudo generar el enlace." }
  return { ok: true, url: data.signedUrl }
}

/**
 * Registra en BD un documento que el cliente ya subió a su carpeta de Storage.
 * Se atribuye al agente propietario del cliente para que la correduría lo vea.
 */
export async function registrarDocumentoPortal(input: {
  nombre: string
  storage_path: string
  mime_type?: string | null
  tamano_bytes?: number | null
}): Promise<{ ok: boolean; error?: string }> {
  const { acceso } = await requirePortal()

  const partes = input.storage_path.split("/")
  if (partes[1] !== acceso.cliente_id) {
    return { ok: false, error: "Ruta de almacenamiento no válida." }
  }

  const admin = createAdminClient()
  const { data: cli } = await admin
    .from("clientes")
    .select("correduria_id, user_id")
    .eq("id", acceso.cliente_id)
    .maybeSingle()
  if (!cli) return { ok: false, error: "Cliente no encontrado." }

  const { error } = await admin.from("documentos").insert({
    correduria_id: cli.correduria_id,
    user_id: cli.user_id, // agente propietario → visible para la correduría
    cliente_id: acceso.cliente_id,
    categoria: "personal",
    nombre: input.nombre,
    storage_path: input.storage_path,
    mime_type: input.mime_type ?? null,
    tamano_bytes: input.tamano_bytes ?? null,
  })
  if (error) return { ok: false, error: "No se pudo registrar el documento." }

  revalidatePath("/portal")
  return { ok: true }
}

