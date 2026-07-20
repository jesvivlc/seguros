"use client"

import * as React from "react"
import Link from "next/link"
import {
  addMonths,
  addWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  setYear,
  getYear,
  format,
} from "date-fns"
import { es } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  RefreshCw,
  Cake,
  ExternalLink,
  Phone,
  type LucideIcon,
} from "lucide-react"
import {
  TIPO_TAREA_LABEL,
  TIPO_POLIZA_LABEL,
  type TipoTarea,
  type TipoPoliza,
  type EstadoTarea,
  type EstadoPoliza,
} from "@/lib/constants"
import { formatFechaLarga } from "@/lib/format"
import { hoyZona } from "@/lib/timezone"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SemaforoBadge } from "@/components/badges"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

type ClienteLite = { id: string; nombre: string; apellidos: string } | null

export type EventoTarea = {
  id: string
  tipo: TipoTarea
  titulo: string
  descripcion: string | null
  fecha_vencimiento: string
  hora: string | null
  estado: EstadoTarea
  cliente: ClienteLite
}

export type EventoRenovacion = {
  id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  fecha_vencimiento: string
  estado: EstadoPoliza
  cliente: ClienteLite
}

export type EventoCumple = {
  id: string
  nombre: string
  apellidos: string
  fecha_nacimiento: string
  telefono: string | null
}

type Kind = "tarea" | "renovacion" | "cumpleanos"

type Evento = {
  key: string
  kind: Kind
  fecha: string // yyyy-MM-dd
  hora: string | null
  titulo: string
  subtitulo: string
  completada?: boolean
  tarea?: EventoTarea
  renovacion?: EventoRenovacion
  cumple?: { cliente: EventoCumple; edad: number }
}

const KIND_ICON: Record<Kind, LucideIcon> = {
  tarea: CalendarClock,
  renovacion: RefreshCw,
  cumpleanos: Cake,
}

const KIND_CHIP: Record<Kind, string> = {
  tarea:
    "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900",
  renovacion:
    "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900",
  cumpleanos:
    "bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-950 dark:text-pink-200 dark:hover:bg-pink-900",
}

const KIND_DOT: Record<Kind, string> = {
  tarea: "bg-blue-500",
  renovacion: "bg-amber-500",
  cumpleanos: "bg-pink-500",
}

const KIND_LABEL: Record<Kind, string> = {
  tarea: "Tarea",
  renovacion: "Renovación",
  cumpleanos: "Cumpleaños",
}

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function Calendario({
  tareas,
  renovaciones,
  cumples,
}: {
  tareas: EventoTarea[]
  renovaciones: EventoRenovacion[]
  cumples: EventoCumple[]
}) {
  const [vista, setVista] = React.useState<"mes" | "semana">("mes")
  const [cursor, setCursor] = React.useState<Date>(() => hoyZona())
  const [sel, setSel] = React.useState<Evento | null>(null)

  const hoy = React.useMemo(() => hoyZona(), [])

  const { start, end } = React.useMemo(() => {
    if (vista === "semana") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      }
    }
    return {
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    }
  }, [cursor, vista])

  const dias = React.useMemo(
    () => eachDayOfInterval({ start, end }),
    [start, end]
  )

  const eventosPorDia = React.useMemo(() => {
    const map = new Map<string, Evento[]>()
    const push = (e: Evento) => {
      const arr = map.get(e.fecha)
      if (arr) arr.push(e)
      else map.set(e.fecha, [e])
    }

    for (const t of tareas) {
      push({
        key: `t-${t.id}`,
        kind: "tarea",
        fecha: t.fecha_vencimiento,
        hora: t.hora,
        titulo: t.titulo,
        subtitulo: TIPO_TAREA_LABEL[t.tipo],
        completada: t.estado === "completada",
        tarea: t,
      })
    }

    for (const r of renovaciones) {
      push({
        key: `r-${r.id}`,
        kind: "renovacion",
        fecha: r.fecha_vencimiento,
        hora: null,
        titulo: `${r.compania} · ${TIPO_POLIZA_LABEL[r.tipo]}`,
        subtitulo: r.numero_poliza,
        renovacion: r,
      })
    }

    // Cumpleaños: recurrentes, se generan para los años visibles.
    const years = Array.from(new Set(dias.map((d) => getYear(d))))
    for (const c of cumples) {
      const nac = parseISO(c.fecha_nacimiento)
      const birthYear = getYear(nac)
      for (const year of years) {
        const fecha = ymd(setYear(nac, year))
        push({
          key: `c-${c.id}-${year}`,
          kind: "cumpleanos",
          fecha,
          hora: null,
          titulo: `${c.nombre} ${c.apellidos}`,
          subtitulo: "Cumpleaños",
          cumple: { cliente: c, edad: year - birthYear },
        })
      }
    }

    for (const arr of map.values()) {
      arr.sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"))
    }
    return map
  }, [tareas, renovaciones, cumples, dias])

  const titulo = React.useMemo(() => {
    if (vista === "semana") {
      const mismoMes = isSameMonth(start, end)
      return mismoMes
        ? `${format(start, "d", { locale: es })}–${format(end, "d 'de' MMMM yyyy", { locale: es })}`
        : `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`
    }
    return format(cursor, "MMMM yyyy", { locale: es })
  }, [vista, start, end, cursor])

  function navegar(dir: -1 | 1) {
    setCursor((c) => (vista === "semana" ? addWeeks(c, dir) : addMonths(c, dir)))
  }

  const filas = vista === "semana" ? 1 : dias.length / 7

  return (
    <div className="grid gap-4">
      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(hoyZona())}>
            Hoy
          </Button>
          <h2 className="ml-1 text-lg font-semibold tracking-tight capitalize">{titulo}</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={vista === "mes" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("mes")}
          >
            Mes
          </Button>
          <Button
            variant={vista === "semana" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("semana")}
          >
            Semana
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {(["tarea", "renovacion", "cumpleanos"] as Kind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", KIND_DOT[k])} />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>

      {/* Rejilla */}
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="text-muted-foreground px-2 py-1.5 text-center text-xs font-medium"
            >
              {d}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-7"
          style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
        >
          {dias.map((dia) => {
            const clave = ymd(dia)
            const eventos = eventosPorDia.get(clave) ?? []
            const esHoy = isSameDay(dia, hoy)
            const fueraDeMes = vista === "mes" && !isSameMonth(dia, cursor)
            const maxVisible = vista === "semana" ? 12 : 3
            return (
              <div
                key={clave}
                className={cn(
                  "flex min-h-24 flex-col gap-1 border-r border-b p-1.5 last:border-r-0 sm:min-h-28",
                  vista === "semana" && "min-h-64",
                  fueraDeMes && "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      esHoy && "bg-primary text-primary-foreground font-semibold",
                      !esHoy && fueraDeMes && "text-muted-foreground/50",
                      !esHoy && !fueraDeMes && "text-muted-foreground"
                    )}
                  >
                    {format(dia, "d")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {eventos.slice(0, maxVisible).map((e) => {
                    const Icon = KIND_ICON[e.kind]
                    return (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => setSel(e)}
                        className={cn(
                          "flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors",
                          KIND_CHIP[e.kind],
                          e.completada && "opacity-50 line-through"
                        )}
                        title={e.titulo}
                      >
                        <Icon className="size-3 shrink-0" />
                        {e.hora && (
                          <span className="shrink-0 tabular-nums">{e.hora.slice(0, 5)}</span>
                        )}
                        <span className="truncate">{e.titulo}</span>
                      </button>
                    )
                  })}
                  {eventos.length > maxVisible && (
                    <span className="text-muted-foreground px-1 text-[10px]">
                      +{eventos.length - maxVisible} más
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <PanelEvento evento={sel} onClose={() => setSel(null)} />
    </div>
  )
}

function PanelEvento({
  evento,
  onClose,
}: {
  evento: Evento | null
  onClose: () => void
}) {
  const Icon = evento ? KIND_ICON[evento.kind] : CalendarClock
  const cliente =
    evento?.tarea?.cliente ??
    evento?.renovacion?.cliente ??
    (evento?.cumple
      ? {
          id: evento.cumple.cliente.id,
          nombre: evento.cumple.cliente.nombre,
          apellidos: evento.cumple.cliente.apellidos,
        }
      : null)

  return (
    <Sheet open={!!evento} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Icon className="size-4" />
            {evento?.titulo}
          </SheetTitle>
          <SheetDescription>
            {evento ? KIND_LABEL[evento.kind] : ""} ·{" "}
            {evento ? formatFechaLarga(evento.fecha) : ""}
            {evento?.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4 text-sm">
          {evento?.kind === "tarea" && evento.tarea && (
            <>
              <Campo etiqueta="Tipo">{TIPO_TAREA_LABEL[evento.tarea.tipo]}</Campo>
              <Campo etiqueta="Estado" className="capitalize">
                {evento.tarea.estado}
              </Campo>
              {evento.tarea.descripcion && (
                <Campo etiqueta="Descripción">
                  <span className="whitespace-pre-wrap">{evento.tarea.descripcion}</span>
                </Campo>
              )}
            </>
          )}

          {evento?.kind === "renovacion" && evento.renovacion && (
            <>
              <Campo etiqueta="Compañía">{evento.renovacion.compania}</Campo>
              <Campo etiqueta="Tipo">{TIPO_POLIZA_LABEL[evento.renovacion.tipo]}</Campo>
              <Campo etiqueta="Nº póliza">
                <span className="font-mono">{evento.renovacion.numero_poliza}</span>
              </Campo>
              <Campo etiqueta="Renovación">
                <SemaforoBadge
                  fechaVencimiento={evento.renovacion.fecha_vencimiento}
                  estado={evento.renovacion.estado}
                />
              </Campo>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                render={<Link href={`/polizas/${evento.renovacion.id}`} />}
              >
                <ExternalLink className="size-4" />
                Abrir póliza
              </Button>
            </>
          )}

          {evento?.kind === "cumpleanos" && evento.cumple && (
            <>
              <Campo etiqueta="Cumple">{evento.cumple.edad} años</Campo>
              {evento.cumple.cliente.telefono && (
                <Button
                  size="sm"
                  className="self-start"
                  render={<a href={`tel:${evento.cumple.cliente.telefono}`} />}
                >
                  <Phone className="size-4" />
                  {evento.cumple.cliente.telefono}
                </Button>
              )}
            </>
          )}

          {cliente && (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              render={<Link href={`/clientes/${cliente.id}`} />}
            >
              <ExternalLink className="size-4" />
              Ficha de {cliente.nombre} {cliente.apellidos}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Campo({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs font-medium uppercase">{etiqueta}</span>
      <span className={className}>{children}</span>
    </div>
  )
}
