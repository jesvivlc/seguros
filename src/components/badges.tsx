import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { calcularSemaforo } from "@/lib/semaforo"
import {
  ESTADO_CLIENTE_LABEL,
  ESTADO_POLIZA_LABEL,
  type EstadoCliente,
  type EstadoPoliza,
} from "@/lib/constants"

const ESTADO_CLIENTE_CLASS: Record<EstadoCliente, string> = {
  activo:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  potencial:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  inactivo:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
}

export function EstadoClienteBadge({ estado }: { estado: EstadoCliente }) {
  return (
    <Badge variant="outline" className={cn(ESTADO_CLIENTE_CLASS[estado])}>
      {ESTADO_CLIENTE_LABEL[estado]}
    </Badge>
  )
}

const ESTADO_POLIZA_CLASS: Record<EstadoPoliza, string> = {
  vigente:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  en_renovacion:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  anulada:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  vencida:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
}

export function EstadoPolizaBadge({ estado }: { estado: EstadoPoliza }) {
  return (
    <Badge variant="outline" className={cn(ESTADO_POLIZA_CLASS[estado])}>
      {ESTADO_POLIZA_LABEL[estado]}
    </Badge>
  )
}

/**
 * Badge de semáforo de renovación. Si la póliza está anulada, no aplica.
 */
export function SemaforoBadge({
  fechaVencimiento,
  estado,
  className,
}: {
  fechaVencimiento: string | null | undefined
  estado?: EstadoPoliza
  className?: string
}) {
  if (estado === "anulada") {
    return (
      <Badge variant="outline" className={cn(ESTADO_POLIZA_CLASS.anulada, className)}>
        Anulada
      </Badge>
    )
  }
  const s = calcularSemaforo(fechaVencimiento)
  return (
    <Badge
      variant="outline"
      className={cn(s.badgeClass, "tabular-nums", className)}
      title={`Vence en ${s.dias} días`}
    >
      <span className={cn("mr-1 inline-block size-1.5 rounded-full", s.dotClass)} />
      {s.label}
    </Badge>
  )
}
