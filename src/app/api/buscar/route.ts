import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

const LIMITE = 8

/**
 * Escapa el valor para usarlo en un patrón ILIKE dentro de `.or()`:
 * - `%` y `_` son comodines de LIKE → se escapan.
 * - `,` `(` `)` rompen la sintaxis del filtro de PostgREST → se eliminan.
 */
function patron(q: string): string {
  const limpio = q.replace(/[(),]/g, " ").replace(/[%_]/g, "\\$&").trim()
  return `%${limpio}%`
}

function mergePorId<T extends { id: string }>(
  a: T[] | null,
  b: T[] | null
): T[] {
  const vistos = new Set<string>()
  const salida: T[] = []
  for (const fila of [...(a ?? []), ...(b ?? [])]) {
    if (!vistos.has(fila.id)) {
      vistos.add(fila.id)
      salida.push(fila)
    }
  }
  return salida
}

/**
 * Buscador universal de clientes y pólizas.
 * Combina dos estrategias y fusiona resultados (tsvector primero por relevancia):
 *  1. tsvector `busqueda` (config 'spanish') → coincidencias por palabra.
 *  2. ILIKE de respaldo → coincidencias parciales de matrículas, números,
 *     DNI y teléfonos que el tsvector no captura.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ clientes: [], polizas: [] })
  }

  const { supabase } = await requireUser()
  const like = patron(q)

  const cliCols = "id, nombre, apellidos, dni_nie, telefono"
  const polCols = "id, numero_poliza, compania, matricula, fecha_vencimiento, cliente_id"

  const [tsCli, ilikeCli, tsPol, ilikePol] = await Promise.all([
    supabase
      .from("clientes")
      .select(cliCols)
      .textSearch("busqueda", q, { type: "websearch", config: "spanish" })
      .limit(LIMITE),
    supabase
      .from("clientes")
      .select(cliCols)
      .or(
        `nombre.ilike.${like},apellidos.ilike.${like},dni_nie.ilike.${like},telefono.ilike.${like},email.ilike.${like}`
      )
      .limit(LIMITE),
    supabase
      .from("polizas")
      .select(polCols)
      .textSearch("busqueda", q, { type: "websearch", config: "spanish" })
      .limit(LIMITE),
    supabase
      .from("polizas")
      .select(polCols)
      .or(
        `numero_poliza.ilike.${like},matricula.ilike.${like},compania.ilike.${like}`
      )
      .limit(LIMITE),
  ])

  const clientes = mergePorId(tsCli.data, ilikeCli.data).slice(0, LIMITE)
  const polizas = mergePorId(tsPol.data, ilikePol.data).slice(0, LIMITE)

  return NextResponse.json({ clientes, polizas })
}
