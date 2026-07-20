import { requireCorreduria } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { ComparadorClient } from "./comparador-client"

export const dynamic = "force-dynamic"

export default async function ComparadorPage() {
  await requireCorreduria()
  return (
    <>
      <PageHeader
        title="Comparador de pólizas"
        description="Sube 2–4 condicionados en PDF y la IA genera una comparativa de coberturas"
      />
      <ComparadorClient />
    </>
  )
}
