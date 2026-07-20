import { differenceInCalendarDays, startOfDay } from "date-fns"
import { toDate } from "@/lib/format"
import { hoyZona } from "@/lib/timezone"

export type NivelSemaforo = "verde" | "amarillo" | "rojo" | "vencida"

export interface Semaforo {
  nivel: NivelSemaforo
  /** Días naturales hasta el vencimiento (negativo si ya venció). */
  dias: number
  label: string
  /** Clases Tailwind para el badge (fondo suave + texto + borde). */
  badgeClass: string
  /** Color sólido para puntos/eventos de calendario. */
  dotClass: string
}

/**
 * Calcula el semáforo de renovación a partir de la fecha de vencimiento.
 * Verde: >60 días · Amarillo: ≤60 días · Rojo: ≤30 días · Vencida: fecha pasada.
 * `hoy` es inyectable para pruebas deterministas.
 */
export function calcularSemaforo(
  fechaVencimiento: string | Date | null | undefined,
  hoy: Date = hoyZona()
): Semaforo {
  const venc = toDate(fechaVencimiento)
  if (!venc) {
    return {
      nivel: "verde",
      dias: Number.POSITIVE_INFINITY,
      label: "Sin fecha",
      badgeClass:
        "bg-muted text-muted-foreground border-transparent",
      dotClass: "bg-muted-foreground",
    }
  }

  const dias = differenceInCalendarDays(startOfDay(venc), startOfDay(hoy))

  if (dias < 0) {
    return {
      nivel: "vencida",
      dias,
      label: `Vencida (${Math.abs(dias)} d)`,
      badgeClass:
        "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
      dotClass: "bg-zinc-400",
    }
  }
  if (dias <= 30) {
    return {
      nivel: "rojo",
      dias,
      label: dias === 0 ? "Vence hoy" : `${dias} d`,
      badgeClass:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
      dotClass: "bg-red-500",
    }
  }
  if (dias <= 60) {
    return {
      nivel: "amarillo",
      dias,
      label: `${dias} d`,
      badgeClass:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
      dotClass: "bg-amber-500",
    }
  }
  return {
    nivel: "verde",
    dias,
    label: `${dias} d`,
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    dotClass: "bg-emerald-500",
  }
}

/** true si la póliza está en amarillo o rojo (renovación próxima). */
export function esRenovacionProxima(
  fechaVencimiento: string | Date | null | undefined,
  hoy: Date = hoyZona()
): boolean {
  const s = calcularSemaforo(fechaVencimiento, hoy)
  return s.nivel === "amarillo" || s.nivel === "rojo"
}
