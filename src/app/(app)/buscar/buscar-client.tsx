"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Users, FileText, Loader2 } from "lucide-react"
import { formatFecha } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface ClienteRes {
  id: string
  nombre: string
  apellidos: string
  dni_nie: string | null
  telefono: string | null
}
interface PolizaRes {
  id: string
  numero_poliza: string
  compania: string
  matricula: string | null
  fecha_vencimiento: string
  cliente_id: string
}
interface Resultado {
  clientes: ClienteRes[]
  polizas: PolizaRes[]
}

const VACIO: Resultado = { clientes: [], polizas: [] }

type Fila =
  | { kind: "cliente"; href: string; cliente: ClienteRes }
  | { kind: "poliza"; href: string; poliza: PolizaRes }

export function BuscarClient() {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [res, setRes] = React.useState<Resultado>(VACIO)
  const [cargando, setCargando] = React.useState(false)
  const [activo, setActivo] = React.useState(0)

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setRes(VACIO)
      setCargando(false)
      return
    }
    setCargando(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
        if (r.ok) {
          const data = (await r.json()) as Resultado
          setRes({ clientes: data.clientes ?? [], polizas: data.polizas ?? [] })
          setActivo(0)
        }
      } catch {
        // abortada o error de red
      } finally {
        setCargando(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  // Lista plana para navegación con teclado.
  const filas = React.useMemo<Fila[]>(() => {
    return [
      ...res.clientes.map((c) => ({
        kind: "cliente" as const,
        href: `/clientes/${c.id}`,
        cliente: c,
      })),
      ...res.polizas.map((p) => ({
        kind: "poliza" as const,
        href: `/polizas/${p.id}`,
        poliza: p,
      })),
    ]
  }, [res])

  function onKeyDown(e: React.KeyboardEvent) {
    if (filas.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActivo((a) => (a + 1) % filas.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActivo((a) => (a - 1 + filas.length) % filas.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const f = filas[activo]
      if (f) router.push(f.href)
    }
  }

  const q = query.trim()
  const sinResultados =
    q.length >= 2 && !cargando && res.clientes.length === 0 && res.polizas.length === 0

  let idx = -1

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        {cargando && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nombre, DNI, teléfono, nº de póliza, matrícula, compañía…"
          className="h-11 pl-9"
          aria-label="Buscar clientes y pólizas"
        />
      </div>

      {q.length > 0 && q.length < 2 && (
        <p className="text-muted-foreground mt-3 text-sm">
          Escribe al menos 2 caracteres.
        </p>
      )}

      {sinResultados && (
        <p className="text-muted-foreground mt-6 text-center text-sm">
          No hay resultados para «{q}».
        </p>
      )}

      <div className="mt-4 grid gap-4">
        {res.clientes.length > 0 && (
          <section>
            <h2 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase">
              Clientes
            </h2>
            <div className="grid gap-1">
              {res.clientes.map((c) => {
                idx++
                const i = idx
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      activo === i ? "border-primary bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <Users className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {c.nombre} {c.apellidos}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {c.dni_nie ?? c.telefono ?? ""}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {res.polizas.length > 0 && (
          <section>
            <h2 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase">
              Pólizas
            </h2>
            <div className="grid gap-1">
              {res.polizas.map((p) => {
                idx++
                const i = idx
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => router.push(`/polizas/${p.id}`)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      activo === i ? "border-primary bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium font-mono">{p.numero_poliza}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {p.compania}
                        {p.matricula ? ` · ${p.matricula}` : ""}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      vence {formatFecha(p.fecha_vencimiento)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
