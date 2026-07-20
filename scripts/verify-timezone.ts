// Verificación del manejo de zona horaria (Europe/Madrid).
// Ejecutar:  node scripts/verify-timezone.ts
//
// Node 24 ejecuta TypeScript directamente (type stripping). Importa el módulo
// REAL src/lib/timezone.ts y comprueba el comportamiento en los límites de la
// medianoche española, incluidas dos tareas a las 00:30 y 23:30.

import {
  differenceInCalendarDays,
  parseISO,
  startOfDay,
} from "date-fns"
import { hoyISOZona, hoyZona, ZONA_HORARIA } from "../src/lib/timezone.ts"

let fallos = 0
function check(desc: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  const icono = ok ? "✓" : "✗"
  console.log(`${icono} ${desc}`)
  if (!ok) console.log(`    esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(real)}`)
}

// Réplica exacta de la fórmula de src/lib/semaforo.ts (que no se importa aquí
// para evitar el alias "@/"): días de calendario hasta el vencimiento.
function diasHastaVencimiento(fechaISO: string, ahora: Date): number {
  return differenceInCalendarDays(
    startOfDay(parseISO(fechaISO)),
    startOfDay(hoyZona(ahora))
  )
}

console.log(`Zona de referencia: ${ZONA_HORARIA}\n`)

// ---------------------------------------------------------------------------
// 1. Límites de medianoche: el "hoy" de Madrid vs. la fecha UTC del servidor.
// ---------------------------------------------------------------------------
console.log("— Límite de medianoche (hoyISOZona) —")

// Verano (CEST, UTC+2): 2026-07-20 00:30 Madrid == 2026-07-19 22:30 UTC.
// El servidor en UTC creería que aún es día 19; en Madrid ya es el 20.
const veranoMedianoche = new Date("2026-07-19T22:30:00Z")
check(
  "00:30 Madrid (verano) => hoy = 2026-07-20 (UTC diría 07-19)",
  hoyISOZona(veranoMedianoche),
  "2026-07-20"
)
check(
  "  (control) la fecha UTC ingenua sería 2026-07-19",
  veranoMedianoche.toISOString().slice(0, 10),
  "2026-07-19"
)

// Verano 23:30 Madrid == 21:30 UTC (mismo día); no debe adelantarse al 21.
const veranoNoche = new Date("2026-07-20T21:30:00Z")
check(
  "23:30 Madrid (verano) => hoy = 2026-07-20",
  hoyISOZona(veranoNoche),
  "2026-07-20"
)

// Invierno (CET, UTC+1): 2026-01-16 00:30 Madrid == 2026-01-15 23:30 UTC.
const inviernoMedianoche = new Date("2026-01-15T23:30:00Z")
check(
  "00:30 Madrid (invierno, UTC+1) => hoy = 2026-01-16",
  hoyISOZona(inviernoMedianoche),
  "2026-01-16"
)

// ---------------------------------------------------------------------------
// 2. Agrupación de tareas a las 00:30 y 23:30 (lógica del dashboard "Mi día").
//    Instante: 2026-07-20 00:30 Madrid (el caso que rompía en UTC).
// ---------------------------------------------------------------------------
console.log("\n— Agrupación de tareas a las 00:30 y 23:30 —")

const ahora = veranoMedianoche // 2026-07-20 00:30 Madrid
const hoyISO = hoyISOZona(ahora)

const tareas = [
  { titulo: "Llamar temprano", fecha_vencimiento: "2026-07-20", hora: "00:30" },
  { titulo: "Llamar tarde", fecha_vencimiento: "2026-07-20", hora: "23:30" },
  { titulo: "De ayer", fecha_vencimiento: "2026-07-19", hora: "23:30" },
]

// Predicados idénticos a los de src/app/(app)/page.tsx.
const tareasHoy = tareas.filter((t) => t.fecha_vencimiento === hoyISO)
const atrasadas = tareas.filter((t) => t.fecha_vencimiento < hoyISO)

check(
  "las tareas de 00:30 y 23:30 (del día 20) se agrupan ambas como HOY",
  tareasHoy.map((t) => t.titulo),
  ["Llamar temprano", "Llamar tarde"]
)
check("la tarea del día 19 queda como ATRASADA", atrasadas.map((t) => t.titulo), ["De ayer"])

// Orden por hora (mismo criterio que la lista): 00:30 antes que 23:30.
const ordenadas = [...tareasHoy].sort((a, b) =>
  (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99")
)
check("ordenadas por hora: 00:30 antes que 23:30", ordenadas.map((t) => t.hora), [
  "00:30",
  "23:30",
])

// Contraste con la lógica UTC ingenua (lo que hacía antes del fix): a las 00:30
// españolas el "hoy" UTC del servidor es todavía el día 19, así que las tareas
// del día 20 desaparecen de "Mi día" y se cuela por error la del día 19.
const hoyISO_utc = ahora.toISOString().slice(0, 10) // "2026-07-19"
const tareasHoy_utc = tareas.filter((t) => t.fecha_vencimiento === hoyISO_utc)
check(
  "  (control) con UTC ingenuo las tareas del día 20 NO aparecen como hoy (bug)",
  tareasHoy_utc.some((t) => t.fecha_vencimiento === "2026-07-20"),
  false
)
check(
  "  (control) con UTC ingenuo se colaba por error la tarea del día 19",
  tareasHoy_utc.map((t) => t.titulo),
  ["De ayer"]
)

// ---------------------------------------------------------------------------
// 3. Días hasta vencimiento (semáforo) en el mismo instante límite.
// ---------------------------------------------------------------------------
console.log("\n— Vencimiento / semáforo en el límite —")
check("póliza vence 2026-07-20 => 0 días (vence hoy)", diasHastaVencimiento("2026-07-20", ahora), 0)
check("póliza vence 2026-07-21 => 1 día", diasHastaVencimiento("2026-07-21", ahora), 1)
check("póliza vence 2026-07-19 => -1 día (vencida)", diasHastaVencimiento("2026-07-19", ahora), -1)

// ---------------------------------------------------------------------------
console.log("")
if (fallos === 0) {
  console.log("TODO OK: los cálculos usan Europe/Madrid en todos los casos.")
} else {
  console.error(`FALLOS: ${fallos}`)
  process.exit(1)
}
