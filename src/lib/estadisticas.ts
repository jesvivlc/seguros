// Cálculos de cartera para /estadisticas. Funciones puras (sin acceso a datos)
// para poder verificarlas con scripts/verify-logica.ts.

import { addDays, addMonths, format, parseISO } from "date-fns"
import type { TipoPoliza, EstadoPoliza } from "@/lib/constants"

export type PolizaCartera = {
  id: string
  tipo: TipoPoliza
  compania: string | null
  estado: EstadoPoliza
  prima_anual: number | null
  fecha_efecto: string
  fecha_vencimiento: string
}

const ACTIVAS: EstadoPoliza[] = ["vigente", "en_renovacion"]

export type MesRenovacion = { mes: string; polizas: number; prima: number }

/**
 * Renovaciones previstas en los próximos `n` meses naturales (mes en curso
 * incluido), a partir de la fecha de vencimiento de las pólizas activas.
 * `hoy` en formato yyyy-MM-dd.
 */
export function renovacionesPorMes(
  polizas: PolizaCartera[],
  hoy: string,
  n = 12
): MesRenovacion[] {
  const base = parseISO(hoy)
  const meses: MesRenovacion[] = []
  for (let i = 0; i < n; i++) {
    meses.push({ mes: format(addMonths(base, i), "yyyy-MM"), polizas: 0, prima: 0 })
  }
  const idx = new Map(meses.map((m, i) => [m.mes, i]))
  for (const p of polizas) {
    if (!ACTIVAS.includes(p.estado)) continue
    const i = idx.get(p.fecha_vencimiento.slice(0, 7))
    // El mes en curso solo cuenta lo que aún no ha vencido.
    if (i === undefined || p.fecha_vencimiento < hoy) continue
    meses[i].polizas++
    meses[i].prima += p.prima_anual ?? 0
  }
  return meses
}

/** Estacionalidad: nº de vencimientos por mes del año (1-12) en toda la cartera activa. */
export function estacionalidad(polizas: PolizaCartera[]): number[] {
  const out = new Array<number>(12).fill(0)
  for (const p of polizas) {
    if (!ACTIVAS.includes(p.estado)) continue
    const m = Number(p.fecha_vencimiento.slice(5, 7))
    if (m >= 1 && m <= 12) out[m - 1]++
  }
  return out
}

export type PrimaMedia = { tipo: TipoPoliza; polizas: number; media: number }

/** Prima media por ramo, solo pólizas vigentes con prima informada. */
export function primaMediaPorTipo(polizas: PolizaCartera[]): PrimaMedia[] {
  const acc = new Map<TipoPoliza, { n: number; suma: number }>()
  for (const p of polizas) {
    if (p.estado !== "vigente" || p.prima_anual == null) continue
    const a = acc.get(p.tipo) ?? { n: 0, suma: 0 }
    a.n++
    a.suma += p.prima_anual
    acc.set(p.tipo, a)
  }
  return [...acc.entries()]
    .map(([tipo, a]) => ({ tipo, polizas: a.n, media: Math.round((a.suma / a.n) * 100) / 100 }))
    .sort((x, y) => y.media - x.media)
}

/** Pólizas activas que vencen entre hoy y hoy + `dias`, ordenadas por fecha. */
export function vencenEn(polizas: PolizaCartera[], hoy: string, dias = 90): PolizaCartera[] {
  const limite = format(addDays(parseISO(hoy), dias), "yyyy-MM-dd")
  return polizas
    .filter(
      (p) =>
        ACTIVAS.includes(p.estado) &&
        p.fecha_vencimiento >= hoy &&
        p.fecha_vencimiento <= limite
    )
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
}
