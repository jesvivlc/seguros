import { cn } from "@/lib/utils"

export interface BarItem {
  label: string
  value: number
  /** Clase Tailwind de color para la barra (por defecto bg-primary). */
  color?: string
}

/**
 * Lista de barras horizontales (sin dependencias). Escala al valor máximo.
 * Presentacional puro: se usa en la página de estadísticas.
 */
export function BarList({
  items,
  formatValue,
}: {
  items: BarItem[]
  formatValue?: (n: number) => string
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin datos todavía.</p>
  }
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="grid gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{it.label}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatValue ? formatValue(it.value) : it.value}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full", it.color ?? "bg-primary")}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
