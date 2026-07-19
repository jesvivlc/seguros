"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, FileText } from "lucide-react"
import {
  TIPO_POLIZA_OPTIONS,
  ESTADO_POLIZA_OPTIONS,
  TIPO_POLIZA_LABEL,
  type TipoPoliza,
  type EstadoPoliza,
} from "@/lib/constants"
import { calcularSemaforo, type NivelSemaforo } from "@/lib/semaforo"
import { formatEuros, formatFecha } from "@/lib/format"
import { EstadoPolizaBadge, SemaforoBadge } from "@/components/badges"
import { SelectSimple } from "@/components/ui/select-field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface PolizaListItem {
  id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  matricula: string | null
  fecha_vencimiento: string
  prima_anual: number | null
  estado: EstadoPoliza
  cliente: { id: string; nombre: string; apellidos: string } | null
}

const SEMAFORO_OPTS = [
  { value: "todos", label: "Todo el semáforo" },
  { value: "rojo", label: "🔴 ≤30 días" },
  { value: "amarillo", label: "🟡 ≤60 días" },
  { value: "verde", label: "🟢 >60 días" },
  { value: "vencida", label: "⚪ Vencidas" },
]

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export function PolizasList({ polizas }: { polizas: PolizaListItem[] }) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [tipo, setTipo] = React.useState<string>("todos")
  const [estado, setEstado] = React.useState<string>("todos")
  const [compania, setCompania] = React.useState<string>("todos")
  const [semaforo, setSemaforo] = React.useState<NivelSemaforo | "todos">("todos")

  const companias = React.useMemo(() => {
    const set = new Set(polizas.map((p) => p.compania).filter(Boolean))
    return [
      { value: "todos", label: "Todas las compañías" },
      ...[...set].sort().map((c) => ({ value: c, label: c })),
    ]
  }, [polizas])

  const filtradas = React.useMemo(() => {
    const term = normaliza(q.trim())
    return polizas.filter((p) => {
      if (tipo !== "todos" && p.tipo !== tipo) return false
      if (estado !== "todos" && p.estado !== estado) return false
      if (compania !== "todos" && p.compania !== compania) return false
      if (semaforo !== "todos") {
        const nivel = calcularSemaforo(p.fecha_vencimiento).nivel
        if (nivel !== semaforo) return false
      }
      if (!term) return true
      const heno = normaliza(
        `${p.compania} ${p.numero_poliza} ${p.matricula ?? ""} ${
          p.cliente ? `${p.cliente.nombre} ${p.cliente.apellidos}` : ""
        }`
      )
      return heno.includes(term)
    })
  }, [polizas, q, tipo, estado, compania, semaforo])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="pl-9"
            aria-label="Buscar pólizas"
          />
        </div>
        <SelectSimple
          value={tipo}
          onValueChange={setTipo}
          options={[{ value: "todos", label: "Todos los tipos" }, ...TIPO_POLIZA_OPTIONS]}
        />
        <SelectSimple value={compania} onValueChange={setCompania} options={companias} />
        <SelectSimple
          value={estado}
          onValueChange={setEstado}
          options={[
            { value: "todos", label: "Todos los estados" },
            ...ESTADO_POLIZA_OPTIONS,
          ]}
        />
        <SelectSimple
          value={semaforo}
          onValueChange={(v) => setSemaforo(v as NivelSemaforo | "todos")}
          options={SEMAFORO_OPTS}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Póliza</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden lg:table-cell">Vencimiento</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Prima</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Renovación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <FileText className="size-8 opacity-40" />
                    {polizas.length === 0
                      ? "Aún no hay pólizas."
                      : "No hay pólizas que coincidan con los filtros."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/polizas/${p.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{p.compania}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {p.numero_poliza}
                      {p.matricula ? ` · ${p.matricula}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.cliente ? (
                      <Link
                        href={`/clientes/${p.cliente.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.cliente.apellidos}, {p.cliente.nombre}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {TIPO_POLIZA_LABEL[p.tipo]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell tabular-nums">
                    {formatFecha(p.fecha_vencimiento)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">
                    {formatEuros(p.prima_anual)}
                  </TableCell>
                  <TableCell>
                    <EstadoPolizaBadge estado={p.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <SemaforoBadge
                      fechaVencimiento={p.fecha_vencimiento}
                      estado={p.estado}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtradas.length} de {polizas.length} pólizas
      </p>
    </div>
  )
}
