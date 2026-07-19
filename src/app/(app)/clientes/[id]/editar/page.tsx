import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ClienteForm } from "../../cliente-form"
import type { ClienteRow } from "@/lib/database.types"
import type { ClienteFormInput } from "@/lib/schemas/cliente"

export const dynamic = "force-dynamic"

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!data) notFound()
  const c = data as ClienteRow

  const defaultValues: Partial<ClienteFormInput> = {
    nombre: c.nombre,
    apellidos: c.apellidos,
    dni_nie: c.dni_nie ?? "",
    fecha_nacimiento: c.fecha_nacimiento ?? "",
    profesion: c.profesion ?? "",
    estado_civil: c.estado_civil ?? "",
    telefono: c.telefono ?? "",
    telefono_2: c.telefono_2 ?? "",
    email: c.email ?? "",
    direccion: c.direccion ?? "",
    codigo_postal: c.codigo_postal ?? "",
    poblacion: c.poblacion ?? "",
    provincia: c.provincia ?? "",
    notas: c.notas ?? "",
    estado: c.estado,
    origen: c.origen ?? "",
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar: ${c.nombre} ${c.apellidos}`}
        description="Modifica los datos del cliente"
      >
        <Button variant="outline" render={<Link href={`/clientes/${id}`} />}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>
      <ClienteForm clienteId={id} defaultValues={defaultValues} />
    </div>
  )
}
