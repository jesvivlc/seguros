import { Download } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { SiniestrosList, type SiniestroListItem } from "./siniestros-list"

export const dynamic = "force-dynamic"

export default async function SiniestrosPage() {
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("siniestros")
    .select(
      "id, numero_siniestro, tipo, estado, fecha_ocurrencia, fecha_apertura, importe_estimado, cliente:clientes(id, nombre, apellidos), poliza:polizas(id, compania, numero_poliza, tipo)"
    )
    .order("created_at", { ascending: false })

  const siniestros = (data ?? []) as unknown as SiniestroListItem[]

  return (
    <>
      <PageHeader
        title="Siniestros"
        description={`${siniestros.length} ${
          siniestros.length === 1 ? "siniestro" : "siniestros"
        } registrados`}
      >
        <Button variant="outline" render={<a href="/api/exportar?tipo=siniestros" />}>
          <Download className="size-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </PageHeader>
      <SiniestrosList siniestros={siniestros} />
    </>
  )
}
