import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { PolizaForm } from "../../poliza-form"
import { getClientesOpciones } from "../../clientes-opciones"
import type { PolizaRow, Cobertura } from "@/lib/database.types"
import type { PolizaFormInput } from "@/lib/schemas/poliza"

export const dynamic = "force-dynamic"

export default async function EditarPolizaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireUser()

  const [{ data }, clientes] = await Promise.all([
    supabase.from("polizas").select("*").eq("id", id).maybeSingle(),
    getClientesOpciones(supabase),
  ])

  if (!data) notFound()
  const p = data as PolizaRow

  const defaultValues: Partial<PolizaFormInput> = {
    cliente_id: p.cliente_id,
    compania: p.compania,
    numero_poliza: p.numero_poliza,
    tipo: p.tipo,
    matricula: p.matricula ?? "",
    riesgo_asegurado: p.riesgo_asegurado ?? "",
    fecha_efecto: p.fecha_efecto,
    fecha_vencimiento: p.fecha_vencimiento,
    prima_anual: p.prima_anual != null ? String(p.prima_anual) : "",
    forma_pago: p.forma_pago,
    coberturas: (Array.isArray(p.coberturas) ? p.coberturas : []) as Cobertura[],
    carencias: p.carencias ?? "",
    observaciones: p.observaciones ?? "",
    estado: p.estado,
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Editar póliza" description={p.numero_poliza}>
        <Button variant="outline" render={<Link href={`/polizas/${id}`} />}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>
      <PolizaForm polizaId={id} clientes={clientes} defaultValues={defaultValues} />
    </div>
  )
}
