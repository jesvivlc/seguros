"use server"

import { requireUser } from "@/lib/auth"
import type { InteraccionRow } from "@/lib/database.types"

/** Últimas 5 interacciones de un cliente, para dar contexto antes de llamar. */
export async function getUltimasInteracciones(
  clienteId: string
): Promise<InteraccionRow[]> {
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("interacciones")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(5)
  return (data ?? []) as InteraccionRow[]
}
