import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { requireCorreduria } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ImprimirButton } from "@/components/imprimir-button"
import { formatEuros, formatFecha } from "@/lib/format"
import { hoyISOZona } from "@/lib/timezone"
import { TIPO_POLIZA_LABEL } from "@/lib/constants"
import {
  clasificarCierre,
  resumenCierre,
  rangoTrimestre,
  trimestreDe,
  ESTADO_CIERRE_LABEL,
  ESTADO_CIERRE_ORDEN,
  type EstadoCierre,
  type PolizaCierre,
} from "@/lib/cierre"

export const dynamic = "force-dynamic"

const CLASE: Record<EstadoCierre, string> = {
  vencida: "text-red-600",
  pendiente: "text-amber-600",
  en_renovacion: "text-blue-600",
  gestionada: "text-emerald-600",
}

type PolizaConCliente = PolizaCierre & {
  numero_poliza: string
  cliente: { nombre: string; apellidos: string } | null
}

function vecino(anio: number, t: number, delta: number) {
  const n = anio * 4 + (t - 1) + delta
  return { anio: Math.floor(n / 4), t: (n % 4) + 1 }
}

export default async function CierreTrimestralPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; t?: string }>
}) {
  const sp = await searchParams
  const { supabase } = await requireCorreduria()

  const actual = trimestreDe(hoyISOZona())
  const anioQ = Number(sp.anio)
  const tQ = Number(sp.t)
  const valido =
    Number.isInteger(anioQ) && anioQ >= 2000 && anioQ <= 2100 && [1, 2, 3, 4].includes(tQ)
  const anio = valido ? anioQ : actual.anio
  const t = valido ? tQ : actual.t
  const { desde, hasta } = rangoTrimestre(anio, t)

  const [{ data: polData }, { data: interData }] = await Promise.all([
    supabase
      .from("polizas")
      .select(
        "id, cliente_id, compania, tipo, estado, prima_anual, fecha_vencimiento, numero_poliza, cliente:clientes(nombre, apellidos)"
      )
      .gte("fecha_vencimiento", desde)
      .lte("fecha_vencimiento", hasta),
    supabase
      .from("interacciones")
      .select("poliza_id")
      .eq("tipo", "renovacion")
      .gte("fecha", desde)
      .lte("fecha", `${hasta}T23:59:59`)
      .not("poliza_id", "is", null),
  ])

  const polizas = (polData ?? []) as unknown as PolizaConCliente[]
  const conGestion = new Set(
    (interData ?? []).map((i) => i.poliza_id).filter((x): x is string => !!x)
  )
  const filas = clasificarCierre(polizas, conGestion)
  const resumen = resumenCierre(filas)
  const porId = new Map(polizas.map((p) => [p.id, p]))
  const prev = vecino(anio, t, -1)
  const next = vecino(anio, t, 1)

  return (
    <>
      <PageHeader
        title={`Cierre ${t}T ${anio}`}
        description={`Renovaciones con vencimiento del ${formatFecha(desde)} al ${formatFecha(hasta)}`}
      >
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="icon" aria-label="Trimestre anterior" render={<Link href={`/cierre?anio=${prev.anio}&t=${prev.t}`} />}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Trimestre siguiente" render={<Link href={`/cierre?anio=${next.anio}&t=${next.t}`} />}>
            <ChevronRight className="size-4" />
          </Button>
          <ImprimirButton label="Imprimir / PDF" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ESTADO_CIERRE_ORDEN.map((e) => (
          <Card key={e}>
            <CardContent>
              <p className={`text-xs font-medium uppercase ${CLASE[e]}`}>{ESTADO_CIERRE_LABEL[e]}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{resumen[e].n}</p>
              <p className="text-muted-foreground text-xs">{formatEuros(resumen[e].prima)} de prima</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4">
        {filas.length === 0 && (
          <p className="text-muted-foreground text-sm">No hay pólizas que venzan en este trimestre.</p>
        )}
        {ESTADO_CIERRE_ORDEN.map((e) => {
          const grupo = filas.filter((f) => f.estadoCierre === e)
          if (grupo.length === 0) return null
          return (
            <Card key={e} className="break-inside-avoid">
              <CardContent className="grid gap-2">
                <h2 className={`text-sm font-semibold ${CLASE[e]}`}>
                  {ESTADO_CIERRE_LABEL[e]} ({grupo.length})
                </h2>
                <ul className="divide-y text-sm">
                  {grupo.map((f) => {
                    const p = porId.get(f.id)!
                    return (
                      <li key={f.id}>
                        <Link
                          href={`/polizas/${f.id}`}
                          className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-x-3 py-2"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-medium">
                              {p.cliente ? `${p.cliente.apellidos}, ${p.cliente.nombre}` : "—"}
                            </span>{" "}
                            · {TIPO_POLIZA_LABEL[f.tipo]} {f.compania ?? ""} · {p.numero_poliza}
                          </span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {formatEuros(f.prima_anual)} · {formatFecha(f.fecha_vencimiento)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        «Gestionada» significa que hay una interacción de tipo «Renovación» registrada en
        el trimestre para esa póliza. Si renuevas sin registrarla en el historial del
        cliente, aparecerá como pendiente.
      </p>
    </>
  )
}
