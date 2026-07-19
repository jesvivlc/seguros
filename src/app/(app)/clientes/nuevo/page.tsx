import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ClienteForm } from "../cliente-form"

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo cliente" description="Alta de un cliente en la cartera">
        <Button variant="outline" render={<Link href="/clientes" />}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>
      <ClienteForm />
    </div>
  )
}
