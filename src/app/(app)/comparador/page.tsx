import Link from "next/link"
import { FolderOpen } from "lucide-react"
import { requireCorreduria } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { getClientesOpciones } from "../polizas/clientes-opciones"
import { ComparadorClient } from "./comparador-client"

export const dynamic = "force-dynamic"

export default async function ComparadorPage() {
  const { supabase } = await requireCorreduria()
  const clientes = await getClientesOpciones(supabase)
  return (
    <>
      <PageHeader
        title="Comparador de pólizas"
        description="Sube 2–4 condicionados en PDF y la IA genera una comparativa de coberturas"
      >
        <Button variant="outline" render={<Link href="/comparador/guardadas" />}>
          <FolderOpen className="size-4" />
          Guardadas
        </Button>
      </PageHeader>
      <ComparadorClient clientes={clientes} />
    </>
  )
}
