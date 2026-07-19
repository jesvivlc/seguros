"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Users } from "lucide-react"
import type { ClienteRow } from "@/lib/database.types"
import type { EstadoCliente } from "@/lib/constants"
import { EstadoClienteBadge } from "@/components/badges"
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

type ClienteLite = Pick<
  ClienteRow,
  | "id"
  | "nombre"
  | "apellidos"
  | "dni_nie"
  | "telefono"
  | "email"
  | "poblacion"
  | "estado"
>

const FILTRO_ESTADO = [
  { value: "todos", label: "Todos los estados" },
  { value: "activo", label: "Activos" },
  { value: "potencial", label: "Potenciales" },
  { value: "inactivo", label: "Inactivos" },
]

function normaliza(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function ClientesList({ clientes }: { clientes: ClienteLite[] }) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [estado, setEstado] = React.useState<EstadoCliente | "todos">("todos")

  const filtrados = React.useMemo(() => {
    const term = normaliza(q.trim())
    return clientes.filter((c) => {
      if (estado !== "todos" && c.estado !== estado) return false
      if (!term) return true
      const heno = normaliza(
        `${c.nombre} ${c.apellidos} ${c.dni_nie ?? ""} ${c.telefono ?? ""} ${
          c.email ?? ""
        } ${c.poblacion ?? ""}`
      )
      return heno.includes(term)
    })
  }, [clientes, q, estado])

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, DNI, teléfono, email…"
            className="pl-9"
            aria-label="Buscar clientes"
          />
        </div>
        <div className="sm:w-56">
          <SelectSimple
            value={estado}
            onValueChange={(v) => setEstado(v as EstadoCliente | "todos")}
            options={FILTRO_ESTADO}
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">DNI/NIE</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Población</TableHead>
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <Users className="size-8 opacity-40" />
                    {clientes.length === 0
                      ? "Aún no tienes clientes. Crea el primero."
                      : "No hay clientes que coincidan con la búsqueda."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {c.apellidos}, {c.nombre}
                    </div>
                    <div className="text-muted-foreground text-xs sm:hidden">
                      {c.telefono ?? c.email ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {c.dni_nie ?? "—"}
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {c.telefono ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.poblacion ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EstadoClienteBadge estado={c.estado} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtrados.length} de {clientes.length} clientes
      </p>
    </div>
  )
}
