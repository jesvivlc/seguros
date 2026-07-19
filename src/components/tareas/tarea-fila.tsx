"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Phone,
  FileText,
  CreditCard,
  FolderInput,
  RefreshCw,
  Users,
  Cake,
  CircleDot,
  MoreHorizontal,
  CalendarClock,
  Trash2,
  User,
  History,
  type LucideIcon,
} from "lucide-react"
import type { TareaConRelaciones } from "@/lib/database.types"
import { TIPO_TAREA_LABEL, type TipoTarea } from "@/lib/constants"
import { formatFecha } from "@/lib/format"
import { cn } from "@/lib/utils"
import { calcularSemaforo } from "@/lib/semaforo"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  completarTarea,
  reabrirTarea,
  posponerTarea,
  eliminarTarea,
} from "@/app/(app)/tareas/actions"

const ICONO: Record<TipoTarea, LucideIcon> = {
  llamar: Phone,
  enviar_comparativa: FileText,
  recordar_pago: CreditCard,
  solicitar_documentacion: FolderInput,
  revisar_renovacion: RefreshCw,
  reunion: Users,
  cumpleanos: Cake,
  otro: CircleDot,
}

export function TareaFila({
  tarea,
  onChange,
  onRemove,
  onOpenContexto,
  showFecha = true,
}: {
  tarea: TareaConRelaciones
  onChange?: (t: TareaConRelaciones) => void
  onRemove?: (id: string) => void
  /** Si se pasa y la tarea tiene cliente, muestra un botón para ver su contexto. */
  onOpenContexto?: (t: TareaConRelaciones) => void
  showFecha?: boolean
}) {
  const [pending, setPending] = React.useState(false)
  const Icon = ICONO[tarea.tipo]
  const completada = tarea.estado === "completada"
  const sem = calcularSemaforo(tarea.fecha_vencimiento)
  const atrasada = !completada && sem.dias < 0

  async function toggle() {
    setPending(true)
    const res = completada ? await reabrirTarea(tarea.id) : await completarTarea(tarea.id)
    setPending(false)
    if (!res.ok || !res.tarea) {
      toast.error(res.error ?? "No se pudo actualizar")
      return
    }
    onChange?.({ ...tarea, ...res.tarea })
    toast.success(completada ? "Tarea reabierta" : "Tarea completada")
  }

  async function posponer(dias: number) {
    setPending(true)
    const res = await posponerTarea(tarea.id, dias)
    setPending(false)
    if (!res.ok || !res.tarea) {
      toast.error(res.error ?? "No se pudo posponer")
      return
    }
    onChange?.({ ...tarea, ...res.tarea })
    toast.success(dias === 1 ? "Pospuesta 1 día" : "Pospuesta 1 semana")
  }

  async function borrar() {
    setPending(true)
    const res = await eliminarTarea(tarea.id)
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo eliminar")
      return
    }
    onRemove?.(tarea.id)
    toast.success("Tarea eliminada")
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        completada && "bg-muted/40",
        pending && "opacity-60"
      )}
    >
      <Checkbox
        checked={completada}
        onCheckedChange={toggle}
        disabled={pending}
        aria-label={completada ? "Reabrir tarea" : "Completar tarea"}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-3.5 shrink-0" />
          <span
            className={cn(
              "text-muted-foreground text-[10px] font-medium uppercase",
            )}
          >
            {TIPO_TAREA_LABEL[tarea.tipo]}
          </span>
          {tarea.hora && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {tarea.hora.slice(0, 5)}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-0.5 font-medium",
            completada && "text-muted-foreground line-through"
          )}
        >
          {tarea.titulo}
        </p>
        {tarea.descripcion && (
          <p className="text-muted-foreground mt-0.5 text-sm">{tarea.descripcion}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {showFecha && (
            <span
              className={cn(
                "text-xs tabular-nums",
                atrasada ? "text-red-600 font-medium" : "text-muted-foreground"
              )}
            >
              {atrasada ? "Atrasada · " : ""}
              {formatFecha(tarea.fecha_vencimiento)}
            </span>
          )}
          {tarea.cliente && (
            <Link
              href={`/clientes/${tarea.cliente.id}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <User className="size-3" />
              {tarea.cliente.nombre} {tarea.cliente.apellidos}
            </Link>
          )}
          {onOpenContexto && tarea.cliente && !completada && (
            <button
              type="button"
              onClick={() => onOpenContexto(tarea)}
              className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium"
            >
              <History className="size-3" />
              Contexto
            </button>
          )}
        </div>
      </div>

      {!completada && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground shrink-0"
                aria-label="Opciones de la tarea"
                disabled={pending}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => posponer(1)}>
              <CalendarClock className="size-4" />
              Posponer 1 día
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => posponer(7)}>
              <CalendarClock className="size-4" />
              Posponer 1 semana
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={borrar}>
              <Trash2 className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
