import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { PolizaForm } from "../poliza-form"
import { getClientesOpciones } from "../clientes-opciones"

export const dynamic = "force-dynamic"

export default async function NuevaPolizaPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const { supabase } = await requireUser()
  const { cliente } = await searchParams
  const clientes = await getClientesOpciones(supabase)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nueva póliza" description="Alta de una póliza">
        <Button variant="outline" render={<Link href="/polizas" />}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>
      <PolizaForm
        clientes={clientes}
        defaultValues={cliente ? { cliente_id: cliente } : undefined}
      />
    </div>
  )
}
