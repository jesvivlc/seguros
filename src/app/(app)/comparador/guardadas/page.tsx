import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireCorreduria } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatFecha } from "@/lib/format"
import type { ComparativaRow, ClienteRow } from "@/lib/database.types"

export const dynamic = "force-dynamic"

type Fila = Pick<ComparativaRow, "id" | "titulo" | "created_at" | "cliente_id"> & {
  cliente: Pick<ClienteRow, "nombre" | "apellidos"> | null
}

export default async function ComparativasGuardadasPage() {
  const { supabase } = await requireCorreduria()
  const { data } = await supabase
    .from("comparativas")
    .select("id, titulo, created_at, cliente_id, cliente:clientes(nombre, apellidos)")
    .order("created_at", { ascending: false })
    .limit(200)
  const filas = (data ?? []) as unknown as Fila[]

  return (
    <>
      <PageHeader title="Comparativas guardadas" description="Listas para enseñar o descargar en PDF">
        <Button variant="outline" render={<Link href="/comparador" />}>
          <ArrowLeft className="size-4" />
          Comparador
        </Button>
      </PageHeader>

      {filas.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no hay comparativas guardadas.</p>
      ) : (
        <div className="grid gap-2">
          {filas.map((f) => (
            <Link key={f.id} href={`/comparador/guardadas/${f.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.titulo}</p>
                    <p className="text-muted-foreground text-xs">
                      {f.cliente ? `${f.cliente.apellidos}, ${f.cliente.nombre}` : "Sin cliente"}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatFecha(f.created_at)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
