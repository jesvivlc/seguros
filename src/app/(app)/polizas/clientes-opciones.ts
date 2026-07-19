import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import type { ClienteOpcion } from "@/components/cliente-combobox"

/** Obtiene la lista de clientes como opciones para el combobox de pólizas. */
export async function getClientesOpciones(
  supabase: SupabaseClient<Database>
): Promise<ClienteOpcion[]> {
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre, apellidos, dni_nie")
    .order("apellidos", { ascending: true })

  return (data ?? []).map((c) => ({
    id: c.id,
    label: `${c.apellidos}, ${c.nombre}`,
    sub: c.dni_nie ?? undefined,
  }))
}
