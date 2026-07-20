"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Phone,
  MessageCircle,
  Mail,
  Users,
  Calculator,
  RefreshCw,
  StickyNote,
  FileText,
  Pencil,
  Send,
  Trash2,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import type { InteraccionConPoliza, InteraccionRow } from "@/lib/database.types"
import {
  TIPO_INTERACCION_OPTIONS,
  TIPO_INTERACCION_LABEL,
  TIPO_POLIZA_LABEL,
  type TipoInteraccion,
  type TipoPoliza,
} from "@/lib/constants"
import { formatFechaHora } from "@/lib/format"
import { crearInteraccion, eliminarInteraccion } from "./interacciones-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SelectSimple } from "@/components/ui/select-field"

export interface PolizaOpcion {
  id: string
  compania: string
  tipo: TipoPoliza
  numero_poliza: string
}

const ICONO: Record<TipoInteraccion, LucideIcon> = {
  llamada: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  reunion: Users,
  presupuesto: Calculator,
  renovacion: RefreshCw,
  nota: StickyNote,
  documento: FileText,
  cambio: Pencil,
}

const COLOR: Record<TipoInteraccion, string> = {
  llamada: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  email: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  reunion: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  presupuesto: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  renovacion: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  nota: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  documento: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  cambio: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
}

type Item = InteraccionConPoliza | (InteraccionRow & { poliza: null; _temp?: boolean })

export function InteraccionesTab({
  clienteId,
  polizas,
  interacciones,
}: {
  clienteId: string
  polizas: PolizaOpcion[]
  interacciones: InteraccionConPoliza[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState<Item[]>(interacciones)
  const [tipo, setTipo] = React.useState<TipoInteraccion>("llamada")
  const [resumen, setResumen] = React.useState("")
  const [detalle, setDetalle] = React.useState("")
  const [polizaId, setPolizaId] = React.useState<string>("")
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => {
    setItems(interacciones)
  }, [interacciones])

  const polizaOptions = React.useMemo(
    () => [
      { value: "", label: "Sin póliza asociada" },
      ...polizas.map((p) => ({
        value: p.id,
        label: `${p.compania} · ${p.numero_poliza}`,
      })),
    ],
    [polizas]
  )

  async function guardar() {
    if (!resumen.trim()) {
      toast.error("Escribe un resumen")
      return
    }
    setGuardando(true)

    const tempId = `temp-${items.length}-${resumen.length}`
    const optimista: Item = {
      id: tempId,
      user_id: "",
      correduria_id: "",
      cliente_id: clienteId,
      poliza_id: polizaId || null,
      tipo,
      resumen: resumen.trim(),
      detalle: detalle.trim() || null,
      fecha: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      poliza: null,
      _temp: true,
    }
    setItems((prev) => [optimista, ...prev])
    const enviado = { tipo, resumen, detalle, polizaId }
    setResumen("")
    setDetalle("")

    const res = await crearInteraccion({
      cliente_id: clienteId,
      poliza_id: enviado.polizaId || undefined,
      tipo: enviado.tipo,
      resumen: enviado.resumen,
      detalle: enviado.detalle || undefined,
    })

    setGuardando(false)

    if (!res.ok || !res.interaccion) {
      setItems((prev) => prev.filter((i) => i.id !== tempId))
      setResumen(enviado.resumen)
      setDetalle(enviado.detalle)
      toast.error(res.error ?? "No se pudo guardar")
      return
    }

    const poliza =
      polizas.find((p) => p.id === res.interaccion!.poliza_id) ?? null
    setItems((prev) =>
      prev.map((i) =>
        i.id === tempId
          ? {
              ...res.interaccion!,
              poliza: poliza
                ? {
                    id: poliza.id,
                    compania: poliza.compania,
                    numero_poliza: poliza.numero_poliza,
                    tipo: poliza.tipo,
                  }
                : null,
            }
          : i
      )
    )
    toast.success("Interacción registrada")
    router.refresh()
  }

  async function borrar(id: string) {
    const previo = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    const res = await eliminarInteraccion(id, clienteId)
    if (!res.ok) {
      setItems(previo)
      toast.error(res.error ?? "No se pudo eliminar")
      return
    }
    toast.success("Interacción eliminada")
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      {/* Alta rápida */}
      <Card id="nueva-interaccion">
        <CardContent className="grid gap-3 pt-6">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <SelectSimple
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoInteraccion)}
              options={TIPO_INTERACCION_OPTIONS}
            />
            <Input
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Resumen (una línea)…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) guardar()
              }}
            />
          </div>
          <Textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={2}
            placeholder="Detalle: todo lo hablado, para tener contexto en la próxima llamada…"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {polizas.length > 0 ? (
              <div className="sm:w-72">
                <SelectSimple
                  value={polizaId}
                  onValueChange={setPolizaId}
                  options={polizaOptions}
                  placeholder="Sin póliza asociada"
                />
              </div>
            ) : (
              <span />
            )}
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no hay interacciones registradas.
        </p>
      ) : (
        <ol className="relative grid gap-4 border-l pl-6">
          {items.map((it) => {
            const Icon = ICONO[it.tipo]
            return (
              <li key={it.id} className="group relative">
                <span
                  className={`absolute -left-[33px] flex size-6 items-center justify-center rounded-full ring-4 ring-background ${COLOR[it.tipo]}`}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-xs font-medium uppercase">
                        {TIPO_INTERACCION_LABEL[it.tipo]}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatFechaHora(it.fecha)}
                      </span>
                      {it.poliza && (
                        <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px]">
                          {TIPO_POLIZA_LABEL[it.poliza.tipo]} ·{" "}
                          {it.poliza.numero_poliza}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-medium">{it.resumen}</p>
                    {it.detalle && (
                      <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                        {it.detalle}
                      </p>
                    )}
                  </div>
                  {!("_temp" in it && it._temp) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground opacity-0 group-hover:opacity-100"
                      aria-label="Eliminar interacción"
                      onClick={() => borrar(it.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
