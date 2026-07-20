"use server"

import { requirePortal } from "@/lib/auth"

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
