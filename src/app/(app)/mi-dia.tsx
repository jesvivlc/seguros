"use client"

import * as React from "react"
import Link from "next/link"
import { Phone, Loader2, MessageSquare, ExternalLink } from "lucide-react"
import type { TareaConRelaciones, InteraccionRow } from "@/lib/database.types"
import { TIPO_INTERACCION_LABEL } from "@/lib/constants"
import { formatFechaHora } from "@/lib/format"
import { TareaFila } from "@/components/tareas/tarea-fila"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { getUltimasInteracciones } from "./mi-dia-actions"

export function MiDia({ tareas }: { tareas: TareaConRelaciones[] }) {
  const [items, setItems] = React.useState<TareaConRelaciones[]>(tareas)
  const [contexto, setContexto] = React.useState<TareaConRelaciones | null>(null)
  const [interacciones, setInteracciones] = React.useState<InteraccionRow[]>([])
  const [cargando, setCargando] = React.useState(false)

  React.useEffect(() => setItems(tareas), [tareas])

  function onChange(t: TareaConRelaciones) {
    setItems((prev) => prev.map((i) => (i.id === t.id ? { ...i, ...t } : i)))
  }
  function onRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function abrirContexto(t: TareaConRelaciones) {
    if (!t.cliente) return
    setContexto(t)
    setInteracciones([])
    setCargando(true)
    const data = await getUltimasInteracciones(t.cliente.id)
    setInteracciones(data)
    setCargando(false)
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        No tienes tareas pendientes para hoy. ¡Buen trabajo! 🎉
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-2">
        {items.map((t) => (
          <TareaFila
            key={t.id}
            tarea={t}
            onChange={onChange}
            onRemove={onRemove}
            onOpenContexto={abrirContexto}
          />
        ))}
      </div>

      <Sheet open={!!contexto} onOpenChange={(o) => !o && setContexto(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Phone className="size-4" />
              {contexto?.cliente
                ? `${contexto.cliente.nombre} ${contexto.cliente.apellidos}`
                : "Contexto"}
            </SheetTitle>
            <SheetDescription>Últimas interacciones antes de llamar.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {contexto?.cliente && (
              <div className="flex flex-wrap gap-2">
                {contexto.cliente.telefono && (
                  <Button size="sm" render={<a href={`tel:${contexto.cliente.telefono}`} />}>
                    <Phone className="size-4" />
                    {contexto.cliente.telefono}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/clientes/${contexto.cliente.id}`} />}
                >
                  <ExternalLink className="size-4" />
                  Abrir ficha
                </Button>
              </div>
            )}

            {cargando ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Cargando interacciones…
              </div>
            ) : interacciones.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
                <MessageSquare className="size-8 opacity-40" />
                Sin interacciones registradas todavía.
              </div>
            ) : (
              <ol className="grid gap-3">
                {interacciones.map((it) => (
                  <li key={it.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs font-medium uppercase">
                        {TIPO_INTERACCION_LABEL[it.tipo]}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatFechaHora(it.fecha)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{it.resumen}</p>
                    {it.detalle && (
                      <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                        {it.detalle}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
