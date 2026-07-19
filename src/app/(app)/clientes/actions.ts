"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { clienteSchema } from "@/lib/schemas/cliente"

export interface ActionResult {
  ok: boolean
  id?: string
  error?: string
  fieldErrors?: Record<string, string>
}

function parseCliente(values: unknown) {
  const parsed = clienteSchema.safeParse(values)
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

export async function crearCliente(values: unknown): Promise<ActionResult> {
  const { data, fieldErrors } = parseCliente(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase, user } = await requireUser()
  const { data: row, error } = await supabase
    .from("clientes")
    .insert({ ...data, user_id: user.id })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Ya existe un cliente con ese DNI/NIE.",
        fieldErrors: { dni_nie: "DNI/NIE duplicado" },
      }
    }
    return { ok: false, error: "No se pudo crear el cliente. Inténtalo de nuevo." }
  }

  revalidatePath("/clientes")
  return { ok: true, id: row.id }
}

export async function actualizarCliente(
  id: string,
  values: unknown
): Promise<ActionResult> {
  const { data, fieldErrors } = parseCliente(values)
  if (!data) return { ok: false, error: "Revisa los campos.", fieldErrors }

  const { supabase } = await requireUser()
  const { error } = await supabase.from("clientes").update(data).eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Ya existe un cliente con ese DNI/NIE.",
        fieldErrors: { dni_nie: "DNI/NIE duplicado" },
      }
    }
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." }
  }

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { ok: true, id }
}

export async function eliminarCliente(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("clientes").delete().eq("id", id)

  if (error) {
    // 23503 = violación de FK (tiene pólizas asociadas con on delete restrict)
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede eliminar: el cliente tiene pólizas. Anúlalas o reasígnalas primero.",
      }
    }
    return { ok: false, error: "No se pudo eliminar el cliente." }
  }

  revalidatePath("/clientes")
  return { ok: true }
}
