import { requireCorreduria } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { TIPO_POLIZA_LABEL, type TipoPoliza } from "@/lib/constants"
import { formatFecha } from "@/lib/format"
import { SimuladorClient, type PolizaOpcion } from "./simulador-client"

export const dynamic = "force-dynamic"

export default async function SimuladorPage() {
  const { supabase } = await requireCorreduria()
  const { data } = await supabase
    .from("polizas")
    .select(
      "id, compania, tipo, prima_anual, fecha_vencimiento, cliente:clientes(nombre, apellidos)"
    )
    .in("estado", ["vigente", "en_renovacion"])
    .not("prima_anual", "is", null)
    .order("fecha_vencimiento", { ascending: true })
    .limit(300)

  const filas = (data ?? []) as unknown as {
    id: string
    compania: string | null
    tipo: TipoPoliza
    prima_anual: number
    fecha_vencimiento: string
    cliente: { nombre: string; apellidos: string } | null
  }[]

  const polizas: PolizaOpcion[] = filas.map((p) => ({
    id: p.id,
    prima: Number(p.prima_anual),
    nombre: `${p.compania ?? "Compañía"} ${TIPO_POLIZA_LABEL[p.tipo]}`,
    label: `${p.cliente ? `${p.cliente.apellidos}, ${p.cliente.nombre}` : "—"} · ${
      TIPO_POLIZA_LABEL[p.tipo]
    } ${p.compania ?? ""} · vence ${formatFecha(p.fecha_vencimiento)}`,
  }))

  return (
    <>
      <PageHeader
        title="Simulador de renovación"
        description="Compara la prima actual con alternativas y mira la diferencia a varios años"
      />
      <SimuladorClient polizas={polizas} />
    </>
  )
}
