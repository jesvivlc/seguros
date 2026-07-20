"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, ShieldAlert } from "lucide-react"
import {
  TIPO_SINIESTRO_OPTIONS,
  ESTADO_SINIESTRO_OPTIONS,
  TIPO_SINIESTRO_LABEL,
  type TipoSiniestro,
  type EstadoSiniestro,
  type TipoPoliza,
} from "@/lib/constants"
import { formatFecha, formatEuros } from "@/lib/format"
import { EstadoSiniestroBadge } from "@/components/badges"
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

export interface SiniestroListItem {
  id: string
  numero_siniestro: string | null
  tipo: TipoSiniestro
  estado: EstadoSiniestro
  fecha_ocurrencia: string | null
  fecha_apertura: string
  importe_estimado: number | null
  cliente: { id: string; nombre: string; apellidos: string } | null
  poliza: { id: string; compania: string; numero_poliza: string; tipo: TipoPoliza } | null
}

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export function SiniestrosList({ siniestros }: { siniestros: SiniestroListItem[] }) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [tipo, setTipo] = React.useState<string>("todos")
  const [estado, setEstado] = React.useState<string>("todos")

  const filtrados = React.useMemo(() => {
    const term = normaliza(q.trim())
    return siniestros.filter((s) => {
      if (tipo !== "todos" && s.tipo !== tipo) return false
      if (estado !== "todos" && s.estado !== estado) return false
      if (!term) return true
      const heno = normaliza(
        `${s.numero_siniestro ?? ""} ${s.poliza?.compania ?? ""} ${
          s.poliza?.numero_poliza ?? ""
        } ${s.cliente ? `${s.cliente.nombre} ${s.cliente.apellidos}` : ""}`
      )
      return heno.includes(term)
    })
  }, [siniestros, q, tipo, estado])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nº, cliente, compañía…"
            className="pl-9"
            aria-label="Buscar siniestros"
          />
        </div>
        <SelectSimple
          value={tipo}
          onValueChange={setTipo}
          options={[{ value: "todos", label: "Todos los tipos" }, ...TIPO_SINIESTRO_OPTIONS]}
        />
        <SelectSimple
          value={estado}
          onValueChange={setEstado}
          options={[{ value: "todos", label: "Todos los estados" }, ...ESTADO_SINIESTRO_OPTIONS]}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Siniestro</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Póliza</TableHead>
              <TableHead className="hidden sm:table-cell">Apertura</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Estimado</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <ShieldAlert className="size-8 opacity-40" />
                    {siniestros.length === 0
                      ? "Aún no hay siniestros. Se registran desde la ficha del cliente."
                      : "No hay siniestros que coincidan con los filtros."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => s.cliente && router.push(`/clientes/${s.cliente.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{TIPO_SINIESTRO_LABEL[s.tipo]}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {s.numero_siniestro ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {s.cliente ? (
                      <Link
                        href={`/clientes/${s.cliente.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.cliente.apellidos}, {s.cliente.nombre}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {s.poliza ? (
                      <span className="text-sm">
                        {s.poliza.compania}{" "}
                        <span className="text-muted-foreground font-mono text-xs">
                          {s.poliza.numero_poliza}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {formatFecha(s.fecha_apertura)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">
                    {formatEuros(s.importe_estimado)}
                  </TableCell>
                  <TableCell>
                    <EstadoSiniestroBadge estado={s.estado} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtrados.length} de {siniestros.length} siniestros
      </p>
    </div>
  )
}
