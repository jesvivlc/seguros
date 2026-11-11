// Verificación de la lógica pura de simulador, estadísticas y cierre trimestral.
// Ejecutar:  node scripts/verify-logica.ts   (Node 24, type stripping)

import { simular, costeAcumulado } from "../src/lib/simulador.ts"
import {
  renovacionesPorMes,
  estacionalidad,
  primaMediaPorTipo,
  vencenEn,
  type PolizaCartera,
} from "../src/lib/estadisticas.ts"
import { anonimizar } from "../src/lib/anonimizar.ts"
import { rangoTrimestre, trimestreDe, clasificarCierre } from "../src/lib/cierre.ts"

let fallos = 0
function check(desc: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? "✓" : "✗"} ${desc}`)
  if (!ok) console.log("   real:    ", JSON.stringify(real), "\n   esperado:", JSON.stringify(esperado))
}

// --- Simulador ---
check("acumulado sin subida", costeAcumulado(100, 3, 0), 300)
check("acumulado con subida 10 %", costeAcumulado(100, 3, 10), 331)
const s = simular({ nombre: "Actual", prima: 500 }, [{ nombre: "B", prima: 450 }], 3, 0)
check("ahorro anual negativo", s.opciones[0].difAnual, -50)
check("variación %", s.opciones[0].difPct, -10)
check("ahorro a 3 años", s.opciones[0].difAcumulada, -150)
check("prima actual 0 → % null", simular({ nombre: "A", prima: 0 }, [{ nombre: "B", prima: 10 }], 1, 0).opciones[0].difPct, null)

// --- Estadísticas ---
const P = (o: Partial<PolizaCartera>): PolizaCartera => ({
  id: "x", tipo: "auto", compania: "A", estado: "vigente", prima_anual: 100,
  fecha_efecto: "2026-01-01", fecha_vencimiento: "2026-12-01", ...o,
})
const cartera = [
  P({ id: "1", fecha_vencimiento: "2026-11-20", prima_anual: 200 }),
  P({ id: "2", fecha_vencimiento: "2026-11-05", prima_anual: 50 }), // ya vencida este mes
  P({ id: "3", fecha_vencimiento: "2027-01-15", tipo: "hogar", prima_anual: 300 }),
  P({ id: "4", fecha_vencimiento: "2027-01-31", estado: "anulada" }),
  P({ id: "5", fecha_vencimiento: "2027-02-10", estado: "en_renovacion", prima_anual: null }),
]
const meses = renovacionesPorMes(cartera, "2026-11-11", 4)
check("meses generados", meses.map((m) => m.mes), ["2026-11", "2026-12", "2027-01", "2027-02"])
check("mes en curso excluye ya vencidas", meses[0], { mes: "2026-11", polizas: 1, prima: 200 })
check("anuladas fuera", meses[2], { mes: "2027-01", polizas: 1, prima: 300 })
check("prima null cuenta 0", meses[3], { mes: "2027-02", polizas: 1, prima: 0 })
check("estacionalidad", estacionalidad(cartera), [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0])
check(
  "prima media por tipo (solo vigentes)",
  primaMediaPorTipo(cartera),
  [
    { tipo: "hogar", polizas: 1, media: 300 },
    { tipo: "auto", polizas: 2, media: 125 },
  ]
)
check("vencen en 90 d", vencenEn(cartera, "2026-11-11", 90).map((p) => p.id), ["1", "3"]) // la 5 vence el 10-feb, un día fuera
check("límite 90 d inclusivo", vencenEn([P({ id: "z", fecha_vencimiento: "2027-02-09" })], "2026-11-11", 90).length, 1)

// --- Cierre trimestral ---
check("T1", rangoTrimestre(2026, 1), { desde: "2026-01-01", hasta: "2026-03-31" })
check("T4", rangoTrimestre(2026, 4), { desde: "2026-10-01", hasta: "2026-12-31" })
check("T2 (30 días)", rangoTrimestre(2026, 2).hasta, "2026-06-30")
check("trimestreDe", trimestreDe("2026-11-11"), { anio: 2026, t: 4 })
let lanza = false
try { rangoTrimestre(2026, 5) } catch { lanza = true }
check("trimestre 5 inválido", lanza, true)

const base = { cliente_id: "c", compania: "A", tipo: "auto" as const, prima_anual: 100, fecha_vencimiento: "2026-11-10" }
const filas = clasificarCierre(
  [
    { ...base, id: "a", estado: "vigente" },
    { ...base, id: "b", estado: "vigente" },
    { ...base, id: "c", estado: "vencida" },
    { ...base, id: "d", estado: "en_renovacion" },
    { ...base, id: "e", estado: "anulada" },
  ],
  new Set(["b"])
)
check(
  "clasificación y orden",
  filas.map((f) => `${f.id}:${f.estadoCierre}`),
  ["c:vencida", "a:pendiente", "d:en_renovacion", "b:gestionada"]
)

// --- Anonimización ---
check("email", anonimizar("escribe a juan.perez@correo.es ya"), "escribe a [email] ya")
check("DNI", anonimizar("DNI 12345678Z ok"), "DNI [documento] ok")
check("NIE", anonimizar("NIE X1234567L ok"), "NIE [documento] ok")
check("teléfono con espacios", anonimizar("llamar al 612 345 678"), "llamar al [teléfono]")
check("teléfono con prefijo", anonimizar("tel +34 612345678."), "tel [teléfono].")
check("IBAN", anonimizar("cuenta ES91 2100 0418 4502 0005 1332 ok"), "cuenta [iban] ok")
check("matrícula", anonimizar("coche 1234 BCD"), "coche [matrícula]")
check(
  "nombre del cliente (con tildes, sin tocar otras palabras)",
  anonimizar("María López llamó; Lópezmar no", ["María", "López"]),
  "el cliente el cliente llamó; Lópezmar no"
)
check("sin datos", anonimizar("Renovación pendiente de revisar"), "Renovación pendiente de revisar")

console.log(fallos === 0 ? "\nTodo correcto." : `\n${fallos} fallo(s).`)
process.exit(fallos === 0 ? 0 : 1)
