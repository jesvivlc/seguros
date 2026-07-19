"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import type { TareaConRelaciones } from "@/lib/database.types"
import { TIPO_TAREA_OPTIONS, type TipoTarea } from "@/lib/constants"
import { crearTarea } from "@/app/(app)/tareas/actions"
import { TareaFila } from "@/components/tareas/tarea-fila"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SelectSimple } from "@/components/ui/select-field"

function hoyISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function TareasTab({
  clienteId,
  tareas,
}: {
  clienteId: string
  tareas: TareaConRelaciones[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState<TareaConRelaciones[]>(tareas)
  const [titulo, setTitulo] = React.useState("")
  const [tipo, setTipo] = React.useState<TipoTarea>("llamar")
  const [fecha, setFecha] = React.useState(hoyISO())
  const [hora, setHora] = React.useState("")
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => setItems(tareas), [tareas])

  const pendientes = items.filter((t) => t.estado !== "completada")
  const completadas = items.filter((t) => t.estado === "completada")

  async function guardar() {
    if (!titulo.trim()) {
      toast.error("Escribe un título")
      return
    }
    setGuardando(true)
    const res = await crearTarea({
      cliente_id: clienteId,
      tipo,
      titulo,
      fecha_vencimiento: fecha,
      hora: hora || undefined,
    })
    setGuardando(false)
    if (!res.ok || !res.tarea) {
      toast.error(res.error ?? "No se pudo crear")
      return
    }
    setItems((prev) => [{ ...res.tarea!, cliente: null, poliza: null }, ...prev])
    setTitulo("")
    setHora("")
    toast.success("Tarea creada")
    router.refresh()
  }

  function onChange(t: TareaConRelaciones) {
    setItems((prev) => prev.map((i) => (i.id === t.id ? { ...i, ...t } : i)))
  }
  function onRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-[1fr_180px_150px_120px_auto] sm:items-end">
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nueva tarea…"
            onKeyDown={(e) => e.key === "Enter" && guardar()}
          />
          <SelectSimple
            value={tipo}
            onValueChange={(v) => setTipo(v as TipoTarea)}
            options={TIPO_TAREA_OPTIONS}
          />
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            aria-label="Hora"
          />
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Añadir
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <h3 className="text-sm font-medium">
          Pendientes{" "}
          <span className="text-muted-foreground">({pendientes.length})</span>
        </h3>
        {pendientes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay tareas pendientes.</p>
        ) : (
          pendientes.map((t) => (
            <TareaFila key={t.id} tarea={t} onChange={onChange} onRemove={onRemove} />
          ))
        )}
      </div>

      {completadas.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-muted-foreground text-sm font-medium">
            Completadas ({completadas.length})
          </h3>
          {completadas.map((t) => (
            <TareaFila key={t.id} tarea={t} onChange={onChange} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}
