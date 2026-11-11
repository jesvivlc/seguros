// Cierre trimestral: estado de cada renovación cuyo vencimiento cae en el
// trimestre. Funciones puras; los datos los carga la página.

import type { EstadoPoliza, TipoPoliza } from "@/lib/constants"

export type EstadoCierre =
  | "gestionada" // renovación con interacción registrada en el trimestre
  | "en_renovacion"
  | "pendiente" // vigente, sin gestión registrada
  | "vencida" // venció sin renovar

export const ESTADO_CIERRE_LABEL: Record<EstadoCierre, string> = {
  gestionada: "Gestionada",
  en_renovacion: "En renovación",
  pendiente: "Pendiente",
  vencida: "Vencida sin renovar",
}
export const ESTADO_CIERRE_ORDEN: EstadoCierre[] = [
  "vencida",
  "pendiente",
  "en_renovacion",
  "gestionada",
]

export type PolizaCierre = {
  id: string
  cliente_id: string
  compania: string | null
  tipo: TipoPoliza
  estado: EstadoPoliza
  prima_anual: number | null
  fecha_vencimiento: string
}

export type FilaCierre = PolizaCierre & { estadoCierre: EstadoCierre }

/** Rango [desde, hasta] (yyyy-MM-dd) del trimestre `t` (1-4) del año `anio`. */
export function rangoTrimestre(anio: number, t: number): { desde: string; hasta: string } {
  if (!Number.isInteger(t) || t < 1 || t > 4) throw new Error("Trimestre fuera de rango")
  const mIni = (t - 1) * 3 + 1
  const mFin = mIni + 2
  const ultimo = new Date(Date.UTC(anio, mFin, 0)).getUTCDate()
  const p = (n: number) => String(n).padStart(2, "0")
  return { desde: `${anio}-${p(mIni)}-01`, hasta: `${anio}-${p(mFin)}-${p(ultimo)}` }
}

/** Trimestre (1-4) de una fecha yyyy-MM-dd. */
export function trimestreDe(fecha: string): { anio: number; t: number } {
  return { anio: Number(fecha.slice(0, 4)), t: Math.ceil(Number(fecha.slice(5, 7)) / 3) }
}

/**
 * Clasifica las pólizas del trimestre. `conGestion` es el conjunto de ids de
 * póliza con alguna interacción de tipo "renovacion" fechada en el trimestre.
 * Las pólizas anuladas no se incluyen.
 */
export function clasificarCierre(
  polizas: PolizaCierre[],
  conGestion: Set<string>
): FilaCierre[] {
  const out: FilaCierre[] = []
  for (const p of polizas) {
    if (p.estado === "anulada") continue
    let estadoCierre: EstadoCierre
    if (p.estado === "vencida") estadoCierre = "vencida"
    else if (p.estado === "en_renovacion") estadoCierre = "en_renovacion"
    else estadoCierre = conGestion.has(p.id) ? "gestionada" : "pendiente"
    out.push({ ...p, estadoCierre })
  }
  return out.sort(
    (a, b) =>
      ESTADO_CIERRE_ORDEN.indexOf(a.estadoCierre) - ESTADO_CIERRE_ORDEN.indexOf(b.estadoCierre) ||
      a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
  )
}

export function resumenCierre(filas: FilaCierre[]) {
  const porEstado = Object.fromEntries(
    ESTADO_CIERRE_ORDEN.map((e) => [e, { n: 0, prima: 0 }])
  ) as Record<EstadoCierre, { n: number; prima: number }>
  for (const f of filas) {
    porEstado[f.estadoCierre].n++
    porEstado[f.estadoCierre].prima += f.prima_anual ?? 0
  }
  return porEstado
}
