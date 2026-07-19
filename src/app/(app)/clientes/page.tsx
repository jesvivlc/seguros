import Link from "next/link"
import { Plus } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ClientesList } from "./clientes-list"
import type { ClienteRow } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("clientes")
    .select(
      "id, nombre, apellidos, dni_nie, telefono, email, poblacion, estado"
    )
    .order("apellidos", { ascending: true })

  const clientes = (data ?? []) as Pick<
    ClienteRow,
    | "id"
    | "nombre"
    | "apellidos"
    | "dni_nie"
    | "telefono"
    | "email"
    | "poblacion"
    | "estado"
  >[]

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} ${
          clientes.length === 1 ? "cliente" : "clientes"
        } en tu cartera`}
      >
        <Button render={<Link href="/clientes/nuevo" />}>
          <Plus className="size-4" />
          Nuevo cliente
        </Button>
      </PageHeader>

      <ClientesList clientes={clientes} />
    </>
  )
}
