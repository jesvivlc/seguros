import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireCorreduria } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ComparativaView } from "@/components/comparativa-view"
import { formatFecha } from "@/lib/format"
import type { ComparativaRow, ClienteRow } from "@/lib/database.types"
import { ImprimirButton } from "@/components/imprimir-button"
import { EliminarComparativaButton } from "../acciones-comparativa"

export const dynamic = "force-dynamic"

export default async function ComparativaGuardadaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, perfil } = await requireCorreduria()

  const { data } = await supabase
    .from("comparativas")
    .select("*, cliente:clientes(nombre, apellidos)")
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const c = data as unknown as ComparativaRow & {
    cliente: Pick<ClienteRow, "nombre" | "apellidos"> | null
  }

  const { data: corr } = await supabase
    .from("corredurias")
    .select("nombre")
    .eq("id", perfil.correduria_id!)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
          render={<Link href="/comparador/guardadas" />}
        >
          <ArrowLeft className="size-4" />
          Guardadas
        </Button>
        <div className="flex items-center gap-2">
          <ImprimirButton />
          <EliminarComparativaButton id={c.id} titulo={c.titulo} />
        </div>
      </div>

      <header className="mb-6">
        {corr?.nombre && (
          <p className="text-muted-foreground text-xs font-medium uppercase">{corr.nombre}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{c.titulo}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {c.cliente ? `Para ${c.cliente.nombre} ${c.cliente.apellidos} · ` : ""}
          {formatFecha(c.created_at)}
        </p>
      </header>

      <ComparativaView res={c.datos} />
    </div>
  )
}
