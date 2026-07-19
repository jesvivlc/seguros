import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil, User } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EstadoPolizaBadge, SemaforoBadge } from "@/components/badges"
import { EliminarPolizaButton } from "./eliminar-poliza-button"
import {
  TIPO_POLIZA_LABEL,
  FORMA_PAGO_LABEL,
} from "@/lib/constants"
import { formatEuros, formatFecha } from "@/lib/format"
import type { PolizaConCliente, Cobertura } from "@/lib/database.types"

export const dynamic = "force-dynamic"

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export default async function PolizaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireUser()

  const { data } = await supabase
    .from("polizas")
    .select("*, cliente:clientes(id, nombre, apellidos)")
    .eq("id", id)
    .maybeSingle()

  if (!data) notFound()
  const p = data as unknown as PolizaConCliente
  const coberturas = (Array.isArray(p.coberturas) ? p.coberturas : []) as Cobertura[]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
          render={<Link href="/polizas" />}
        >
          <ArrowLeft className="size-4" />
          Pólizas
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {p.compania}
            </h1>
            <EstadoPolizaBadge estado={p.estado} />
            <SemaforoBadge fechaVencimiento={p.fecha_vencimiento} estado={p.estado} />
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {p.numero_poliza} · {TIPO_POLIZA_LABEL[p.tipo]}
          </p>
          {p.cliente && (
            <Button
              variant="link"
              className="text-muted-foreground h-auto p-0"
              render={<Link href={`/clientes/${p.cliente.id}`} />}
            >
              <User className="size-3.5" />
              {p.cliente.nombre} {p.cliente.apellidos}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href={`/polizas/${id}/editar`} />}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <EliminarPolizaButton
            id={p.id}
            numero={p.numero_poliza}
            clienteId={p.cliente_id}
          />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de la póliza</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Dato label="Tipo">{TIPO_POLIZA_LABEL[p.tipo]}</Dato>
              {p.matricula && <Dato label="Matrícula">{p.matricula}</Dato>}
              {p.riesgo_asegurado && (
                <Dato label="Riesgo asegurado">{p.riesgo_asegurado}</Dato>
              )}
              <Dato label="Fecha de efecto">{formatFecha(p.fecha_efecto)}</Dato>
              <Dato label="Vencimiento">{formatFecha(p.fecha_vencimiento)}</Dato>
              <Dato label="Prima anual">{formatEuros(p.prima_anual)}</Dato>
              <Dato label="Forma de pago">{FORMA_PAGO_LABEL[p.forma_pago]}</Dato>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Coberturas{" "}
              <span className="text-muted-foreground font-normal">
                ({coberturas.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coberturas.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No se han registrado coberturas.
              </p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Garantía</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Franquicia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coberturas.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell>{c.capital || "—"}</TableCell>
                        <TableCell>{c.franquicia || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {(p.carencias || p.observaciones) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {p.carencias && (
                <Dato label="Carencias">
                  <span className="font-normal whitespace-pre-wrap">
                    {p.carencias}
                  </span>
                </Dato>
              )}
              {p.observaciones && (
                <Dato label="Observaciones">
                  <span className="font-normal whitespace-pre-wrap">
                    {p.observaciones}
                  </span>
                </Dato>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
