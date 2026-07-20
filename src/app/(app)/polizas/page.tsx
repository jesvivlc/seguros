import Link from "next/link"
import { Plus, Download } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { PolizasList, type PolizaListItem } from "./polizas-list"

export const dynamic = "force-dynamic"

export default async function PolizasPage() {
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("polizas")
    .select(
      "id, compania, numero_poliza, tipo, matricula, fecha_vencimiento, prima_anual, estado, cliente:clientes(id, nombre, apellidos)"
    )
    .order("fecha_vencimiento", { ascending: true })

  const polizas = (data ?? []) as unknown as PolizaListItem[]

  return (
    <>
      <PageHeader
        title="Pólizas"
        description={`${polizas.length} ${
          polizas.length === 1 ? "póliza" : "pólizas"
        } en cartera`}
      >
        <Button variant="outline" render={<a href="/api/exportar?tipo=polizas" />}>
          <Download className="size-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
        <Button render={<Link href="/polizas/nueva" />}>
          <Plus className="size-4" />
          Nueva póliza
        </Button>
      </PageHeader>

      <PolizasList polizas={polizas} />
    </>
  )
}
