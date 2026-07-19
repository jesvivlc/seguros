import { PageHeader } from "@/components/layout/page-header"
import { BuscarClient } from "./buscar-client"

export default function BuscarPage() {
  return (
    <>
      <PageHeader
        title="Buscar"
        description="Clientes y pólizas · también con ⌘K / Ctrl+K desde cualquier pantalla"
      />
      <BuscarClient />
    </>
  )
}
