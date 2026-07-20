import { requireCorreduria } from "@/lib/auth"
import { toCSV } from "@/lib/csv"
import { formatFecha } from "@/lib/format"
import {
  TIPO_POLIZA_LABEL,
  ESTADO_POLIZA_LABEL,
  ESTADO_CLIENTE_LABEL,
  TIPO_SINIESTRO_LABEL,
  ESTADO_SINIESTRO_LABEL,
  type TipoPoliza,
  type EstadoPoliza,
  type TipoSiniestro,
  type EstadoSiniestro,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

type Cli = { nombre: string; apellidos: string } | null

type PolizaExport = {
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  matricula: string | null
  fecha_efecto: string
  fecha_vencimiento: string
  prima_anual: number | null
  estado: EstadoPoliza
  cliente: Cli
}
type SiniestroExport = {
  numero_siniestro: string | null
  tipo: TipoSiniestro
  estado: EstadoSiniestro
  fecha_ocurrencia: string | null
  fecha_apertura: string
  importe_estimado: number | null
  importe_indemnizado: number | null
  cliente: Cli
  poliza: { numero_poliza: string; compania: string } | null
}

const nombreCli = (c: Cli) => (c ? `${c.apellidos}, ${c.nombre}` : "")

export async function GET(request: Request) {
  const { supabase } = await requireCorreduria()
  const tipo = new URL(request.url).searchParams.get("tipo")

  let headers: string[] = []
  let rows: (string | number | null)[][] = []
  let nombre = "export"

  if (tipo === "clientes") {
    nombre = "clientes"
    const { data } = await supabase
      .from("clientes")
      .select(
        "nombre, apellidos, dni_nie, telefono, email, poblacion, provincia, estado, fecha_nacimiento, created_at"
      )
      .order("apellidos", { ascending: true })
    headers = ["Nombre", "Apellidos", "DNI/NIE", "Teléfono", "Email", "Población", "Provincia", "Estado", "Nacimiento", "Alta"]
    rows = (data ?? []).map((c) => [
      c.nombre, c.apellidos, c.dni_nie ?? "", c.telefono ?? "", c.email ?? "",
      c.poblacion ?? "", c.provincia ?? "", ESTADO_CLIENTE_LABEL[c.estado],
      c.fecha_nacimiento ? formatFecha(c.fecha_nacimiento) : "", formatFecha(c.created_at),
    ])
  } else if (tipo === "polizas") {
    nombre = "polizas"
    const { data } = await supabase
      .from("polizas")
      .select(
        "compania, numero_poliza, tipo, matricula, fecha_efecto, fecha_vencimiento, prima_anual, estado, cliente:clientes(nombre, apellidos)"
      )
      .order("fecha_vencimiento", { ascending: true })
    const lista = (data ?? []) as unknown as PolizaExport[]
    headers = ["Compañía", "Nº póliza", "Tipo", "Matrícula", "Cliente", "Efecto", "Vencimiento", "Prima anual", "Estado"]
    rows = lista.map((p) => [
      p.compania, p.numero_poliza, TIPO_POLIZA_LABEL[p.tipo], p.matricula ?? "",
      nombreCli(p.cliente), formatFecha(p.fecha_efecto), formatFecha(p.fecha_vencimiento),
      p.prima_anual ?? "", ESTADO_POLIZA_LABEL[p.estado],
    ])
  } else if (tipo === "siniestros") {
    nombre = "siniestros"
    const { data } = await supabase
      .from("siniestros")
      .select(
        "numero_siniestro, tipo, estado, fecha_ocurrencia, fecha_apertura, importe_estimado, importe_indemnizado, cliente:clientes(nombre, apellidos), poliza:polizas(numero_poliza, compania)"
      )
      .order("created_at", { ascending: false })
    const lista = (data ?? []) as unknown as SiniestroExport[]
    headers = ["Nº siniestro", "Tipo", "Estado", "Cliente", "Póliza", "Ocurrencia", "Apertura", "Importe estimado", "Importe indemnizado"]
    rows = lista.map((s) => [
      s.numero_siniestro ?? "", TIPO_SINIESTRO_LABEL[s.tipo], ESTADO_SINIESTRO_LABEL[s.estado],
      nombreCli(s.cliente), s.poliza ? `${s.poliza.compania} ${s.poliza.numero_poliza}` : "",
      s.fecha_ocurrencia ? formatFecha(s.fecha_ocurrencia) : "", formatFecha(s.fecha_apertura),
      s.importe_estimado ?? "", s.importe_indemnizado ?? "",
    ])
  } else {
    return new Response("Tipo no válido (clientes | polizas | siniestros).", { status: 400 })
  }

  const csv = toCSV(headers, rows)
  const fecha = formatFecha(new Date()).replace(/\//g, "-")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}-${fecha}.csv"`,
    },
  })
}
