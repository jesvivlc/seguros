import { Users, FileText, Euro, ShieldAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarList, type BarItem } from "@/components/charts/bar-list"
import { calcularSemaforo } from "@/lib/semaforo"
import { formatEuros } from "@/lib/format"
import {
  TIPO_POLIZA_LABEL,
  ESTADO_SINIESTRO_LABEL,
  type TipoPoliza,
  type EstadoPoliza,
  type EstadoSiniestro,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

type PolizaStat = {
  tipo: TipoPoliza
  compania: string | null
  estado: EstadoPoliza
  prima_anual: number | null
  fecha_vencimiento: string
}
type SiniestroStat = {
  estado: EstadoSiniestro
  importe_estimado: number | null
  importe_indemnizado: number | null
}

const SINIESTRO_BAR: Record<EstadoSiniestro, string> = {
  abierto: "bg-blue-500",
  en_tramite: "bg-amber-500",
  pericial: "bg-violet-500",
  resuelto: "bg-emerald-500",
  rechazado: "bg-red-500",
  cerrado: "bg-zinc-400",
}
const ESTADO_SINIESTRO_ORDEN: EstadoSiniestro[] = [
  "abierto", "en_tramite", "pericial", "resuelto", "rechazado", "cerrado",
]

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card>
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
}

export default async function EstadisticasPage() {
  const { supabase } = await requireUser()

  const [{ data: cliData }, { data: polData }, { data: sinData }, { count: tareasPend }] =
    await Promise.all([
      supabase.from("clientes").select("estado"),
      supabase.from("polizas").select("tipo, compania, estado, prima_anual, fecha_vencimiento"),
      supabase.from("siniestros").select("estado, importe_estimado, importe_indemnizado"),
      supabase
        .from("tareas")
        .select("id", { count: "exact", head: true })
        .in("estado", ["pendiente", "pospuesta"]),
    ])

  const clientes = (cliData ?? []) as { estado: string }[]
  const polizas = (polData ?? []) as unknown as PolizaStat[]
  const siniestros = (sinData ?? []) as unknown as SiniestroStat[]

  // KPIs
  const clientesActivos = clientes.filter((c) => c.estado === "activo").length
  const vigentes = polizas.filter((p) => p.estado === "vigente")
  const primaCartera = vigentes.reduce((s, p) => s + (p.prima_anual ?? 0), 0)
  const siniestrosAbiertos = siniestros.filter(
    (s) => !["resuelto", "rechazado", "cerrado"].includes(s.estado)
  ).length

  // Semáforo de renovaciones (pólizas vigentes / en renovación)
  const renovables = polizas.filter(
    (p) => p.estado === "vigente" || p.estado === "en_renovacion"
  )
  const sem = { rojo: 0, amarillo: 0, verde: 0, vencida: 0 }
  for (const p of renovables) sem[calcularSemaforo(p.fecha_vencimiento).nivel]++

  // Pólizas por tipo
  const porTipo: BarItem[] = Object.entries(
    polizas.reduce<Record<string, number>>((m, p) => {
      m[p.tipo] = (m[p.tipo] ?? 0) + 1
      return m
    }, {})
  )
    .map(([tipo, value]) => ({ label: TIPO_POLIZA_LABEL[tipo as TipoPoliza], value }))
    .sort((a, b) => b.value - a.value)

  // Prima anual (cartera vigente) por tipo
  const primaPorTipo: BarItem[] = Object.entries(
    vigentes.reduce<Record<string, number>>((m, p) => {
      m[p.tipo] = (m[p.tipo] ?? 0) + (p.prima_anual ?? 0)
      return m
    }, {})
  )
    .map(([tipo, value]) => ({ label: TIPO_POLIZA_LABEL[tipo as TipoPoliza], value }))
    .sort((a, b) => b.value - a.value)

  // Top compañías (por nº de pólizas)
  const topCompanias: BarItem[] = Object.entries(
    polizas.reduce<Record<string, number>>((m, p) => {
      const c = p.compania?.trim()
      if (c) m[c] = (m[c] ?? 0) + 1
      return m
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Siniestros por estado
  const sinPorEstado: BarItem[] = ESTADO_SINIESTRO_ORDEN.map((e) => ({
    label: ESTADO_SINIESTRO_LABEL[e],
    value: siniestros.filter((s) => s.estado === e).length,
    color: SINIESTRO_BAR[e],
  })).filter((b) => b.value > 0)

  const importeEstimado = siniestros.reduce((s, x) => s + (x.importe_estimado ?? 0), 0)
  const importeIndemnizado = siniestros.reduce((s, x) => s + (x.importe_indemnizado ?? 0), 0)

  return (
    <>
      <PageHeader title="Estadísticas" description="Resumen de tu cartera" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Clientes activos" value={clientesActivos} hint={`${clientes.length} en total`} />
        <StatTile icon={FileText} label="Pólizas vigentes" value={vigentes.length} hint={`${polizas.length} en cartera`} />
        <StatTile icon={Euro} label="Prima en cartera" value={formatEuros(primaCartera)} hint="pólizas vigentes/año" />
        <StatTile icon={ShieldAlert} label="Siniestros abiertos" value={siniestrosAbiertos} hint={`${siniestros.length} en total`} />
      </div>

      {/* Semáforo de renovaciones */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-red-600">
              <span className="size-2 rounded-full bg-red-500" /> ≤30 días
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{sem.rojo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-amber-600">
              <span className="size-2 rounded-full bg-amber-500" /> ≤60 días
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{sem.amarillo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-emerald-600">
              <span className="size-2 rounded-full bg-emerald-500" /> &gt;60 días
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{sem.verde}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pólizas por tipo</CardTitle></CardHeader>
          <CardContent><BarList items={porTipo} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top compañías</CardTitle></CardHeader>
          <CardContent><BarList items={topCompanias} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Prima anual por tipo (cartera vigente)</CardTitle></CardHeader>
          <CardContent><BarList items={primaPorTipo} formatValue={formatEuros} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Siniestros por estado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <BarList items={sinPorEstado} />
            <p className="text-muted-foreground text-xs">
              Estimado: {formatEuros(importeEstimado)} · Indemnizado:{" "}
              {formatEuros(importeIndemnizado)} · Tareas pendientes: {tareasPend ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
