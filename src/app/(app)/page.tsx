import Link from "next/link"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Users, CalendarClock, RefreshCw, ListTodo, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SemaforoBadge } from "@/components/badges"
import { TIPO_POLIZA_LABEL, type TipoPoliza, type EstadoPoliza } from "@/lib/constants"
import { formatFecha } from "@/lib/format"
import { calcularSemaforo } from "@/lib/semaforo"
import type { TareaConRelaciones } from "@/lib/database.types"
import { MiDia } from "./mi-dia"

export const dynamic = "force-dynamic"

type PolizaRenov = {
  id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  fecha_vencimiento: string
  estado: EstadoPoliza
  cliente: { id: string; nombre: string; apellidos: string } | null
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon
  label: string
  value: number
  hint?: string
  href?: string
}) {
  const body = (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
        </div>
        <Icon className="text-muted-foreground size-5 shrink-0" />
      </CardContent>
    </Card>
  )
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

export default async function DashboardPage() {
  const { supabase } = await requireUser()
  const hoy = new Date()
  const hoyISO = format(hoy, "yyyy-MM-dd")
  const limiteISO = format(addDays(hoy, 60), "yyyy-MM-dd")

  const [{ count: clientesActivos }, { data: tareasData }, { data: polizasData }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activo"),
      supabase
        .from("tareas")
        .select(
          "*, cliente:clientes(id, nombre, apellidos, telefono), poliza:polizas(id, compania, tipo, numero_poliza)"
        )
        .in("estado", ["pendiente", "pospuesta"])
        .lte("fecha_vencimiento", hoyISO)
        .order("fecha_vencimiento", { ascending: true })
        .order("hora", { ascending: true, nullsFirst: false }),
      supabase
        .from("polizas")
        .select(
          "id, compania, numero_poliza, tipo, fecha_vencimiento, estado, cliente:clientes(id, nombre, apellidos)"
        )
        .in("estado", ["vigente", "en_renovacion"])
        .gte("fecha_vencimiento", hoyISO)
        .lte("fecha_vencimiento", limiteISO)
        .order("fecha_vencimiento", { ascending: true }),
    ])

  const tareas = (tareasData ?? []) as unknown as TareaConRelaciones[]
  const renovaciones = (polizasData ?? []) as unknown as PolizaRenov[]

  const tareasHoy = tareas.filter((t) => t.fecha_vencimiento === hoyISO)
  const atrasadas = tareas.filter((t) => t.fecha_vencimiento < hoyISO)

  const renovHoy = renovaciones.filter((p) => p.fecha_vencimiento === hoyISO).length
  const rojas = renovaciones.filter(
    (p) => calcularSemaforo(p.fecha_vencimiento, hoy).nivel === "rojo"
  ).length
  const amarillas = renovaciones.filter(
    (p) => calcularSemaforo(p.fecha_vencimiento, hoy).nivel === "amarillo"
  ).length

  const hoyLargo = format(hoy, "EEEE, d 'de' MMMM", { locale: es })
  const descripcion = hoyLargo.charAt(0).toUpperCase() + hoyLargo.slice(1)

  return (
    <>
      <PageHeader title="Mi día" description={descripcion} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Clientes activos"
          value={clientesActivos ?? 0}
          hint="en cartera"
          href="/clientes"
        />
        <StatCard
          icon={CalendarClock}
          label="Renovaciones hoy"
          value={renovHoy}
          hint={renovHoy === 0 ? "ninguna vence hoy" : "vencen hoy"}
        />
        <StatCard
          icon={RefreshCw}
          label="Renovaciones del mes"
          value={rojas + amarillas}
          hint={`${rojas} en rojo · ${amarillas} en amarillo`}
        />
        <StatCard
          icon={ListTodo}
          label="Tareas de hoy"
          value={tareasHoy.length}
          hint={atrasadas.length > 0 ? `${atrasadas.length} atrasadas` : "sin atrasos"}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Mi día{" "}
          <span className="text-muted-foreground text-sm font-normal">
            ({tareas.length})
          </span>
        </h2>
        <MiDia tareas={tareas} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Renovaciones próximas{" "}
            <span className="text-muted-foreground text-sm font-normal">
              ({renovaciones.length})
            </span>
          </h2>
          <Link
            href="/polizas"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            Ver pólizas
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {renovaciones.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No hay renovaciones en los próximos 60 días.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Póliza</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Vencimiento</TableHead>
                  <TableHead className="text-right">Renovación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renovaciones.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/polizas/${p.id}`} className="font-medium hover:underline">
                        {p.compania}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">
                        {p.numero_poliza}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.cliente ? (
                        <Link
                          href={`/clientes/${p.cliente.id}`}
                          className="hover:underline"
                        >
                          {p.cliente.apellidos}, {p.cliente.nombre}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {TIPO_POLIZA_LABEL[p.tipo]}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums">
                      {formatFecha(p.fecha_vencimiento)}
                    </TableCell>
                    <TableCell className="text-right">
                      <SemaforoBadge fechaVencimiento={p.fecha_vencimiento} estado={p.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  )
}
