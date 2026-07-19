import { PageHeader } from "@/components/layout/page-header"

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Mi día" description="Resumen de hoy" />
      <p className="text-muted-foreground text-sm">
        El dashboard se construye en el bloque 7.
      </p>
    </>
  )
}
