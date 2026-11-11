// Simulador de renovación: aritmética pura sobre las primas que introduce el
// usuario. No consulta tarifas ni inventa datos; cada cifra lleva su fórmula.

export interface OpcionSimulador {
  nombre: string
  /** Prima anual en euros. */
  prima: number
}

export interface ResultadoOpcion {
  nombre: string
  prima: number
  /** Diferencia anual frente a la póliza actual (negativa = ahorro). */
  difAnual: number
  difAnualFormula: string
  /** Variación porcentual frente a la actual (null si la actual es 0). */
  difPct: number | null
  difPctFormula: string
  /** Coste acumulado a `anios` años con la subida anual indicada. */
  acumulado: number
  acumuladoFormula: string
  /** Diferencia de coste acumulado frente a la actual. */
  difAcumulada: number
}

export interface ResultadoSimulacion {
  anios: number
  subidaPct: number
  actual: { nombre: string; prima: number; acumulado: number; acumuladoFormula: string }
  opciones: ResultadoOpcion[]
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €"

/** Suma de prima·(1+s)^k para k = 0..anios-1. */
export function costeAcumulado(prima: number, anios: number, subidaPct: number): number {
  const f = 1 + subidaPct / 100
  let total = 0
  for (let k = 0; k < anios; k++) total += prima * Math.pow(f, k)
  return r2(total)
}

function formulaAcum(prima: number, anios: number, subidaPct: number): string {
  return subidaPct === 0
    ? `${eur(prima)} × ${anios} años`
    : `Σ ${eur(prima)} × (1 + ${subidaPct} %)^k, k = 0…${anios - 1}`
}

export function simular(
  actual: OpcionSimulador,
  alternativas: OpcionSimulador[],
  anios: number,
  subidaPct: number
): ResultadoSimulacion {
  const acumActual = costeAcumulado(actual.prima, anios, subidaPct)
  return {
    anios,
    subidaPct,
    actual: {
      nombre: actual.nombre,
      prima: r2(actual.prima),
      acumulado: acumActual,
      acumuladoFormula: formulaAcum(actual.prima, anios, subidaPct),
    },
    opciones: alternativas.map((a) => {
      const difAnual = r2(a.prima - actual.prima)
      const acumulado = costeAcumulado(a.prima, anios, subidaPct)
      return {
        nombre: a.nombre,
        prima: r2(a.prima),
        difAnual,
        difAnualFormula: `${eur(a.prima)} − ${eur(actual.prima)}`,
        difPct: actual.prima > 0 ? r2((difAnual / actual.prima) * 100) : null,
        difPctFormula: `(${eur(a.prima)} − ${eur(actual.prima)}) ÷ ${eur(actual.prima)} × 100`,
        acumulado,
        acumuladoFormula: formulaAcum(a.prima, anios, subidaPct),
        difAcumulada: r2(acumulado - acumActual),
      }
    }),
  }
}
