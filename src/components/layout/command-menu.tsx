"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { NAV_ITEMS } from "@/lib/nav"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Users, FileText, Loader2 } from "lucide-react"
import { formatFecha } from "@/lib/format"

interface ResultadoBusqueda {
  clientes: {
    id: string
    nombre: string
    apellidos: string
    dni_nie: string | null
    telefono: string | null
  }[]
  polizas: {
    id: string
    numero_poliza: string
    compania: string
    matricula: string | null
    fecha_vencimiento: string
    cliente_id: string
  }[]
}

const VACIO: ResultadoBusqueda = { clientes: [], polizas: [] }

/**
 * Paleta de comandos global (Cmd/Ctrl+K): navegación + búsqueda de
 * clientes y pólizas contra /api/buscar.
 */
export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [resultados, setResultados] = React.useState<ResultadoBusqueda>(VACIO)
  const [cargando, setCargando] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    // Escucha el evento personalizado del botón de la barra superior.
    const onOpen = () => setOpen(true)
    document.addEventListener("keydown", onKey)
    document.addEventListener("crm:abrir-buscador", onOpen)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("crm:abrir-buscador", onOpen)
    }
  }, [])

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResultados(VACIO)
      setCargando(false)
      return
    }
    setCargando(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
        if (res.ok) {
          const data = (await res.json()) as ResultadoBusqueda
          setResultados({
            clientes: data.clientes ?? [],
            polizas: data.polizas ?? [],
          })
        }
      } catch {
        // abortada o error de red: se ignora
      } finally {
        setCargando(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  const irA = React.useCallback(
    (href: string) => {
      setOpen(false)
      setQuery("")
      router.push(href)
    },
    [router]
  )

  const sinResultados =
    resultados.clientes.length === 0 && resultados.polizas.length === 0

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={false}
      title="Buscador"
      description="Busca clientes, pólizas o navega por la aplicación"
    >
      <CommandInput
        placeholder="Buscar clientes, pólizas, matrículas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {cargando && (
          <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm">
            <Loader2 className="size-4 animate-spin" /> Buscando…
          </div>
        )}

        {!cargando && query.trim().length >= 2 && sinResultados && (
          <CommandEmpty>No hay resultados para «{query}».</CommandEmpty>
        )}

        {resultados.clientes.length > 0 && (
          <CommandGroup heading="Clientes">
            {resultados.clientes.map((c) => (
              <CommandItem
                key={c.id}
                value={`cliente-${c.id}`}
                onSelect={() => irA(`/clientes/${c.id}`)}
              >
                <Users className="size-4" />
                <span className="font-medium">
                  {c.nombre} {c.apellidos}
                </span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {c.dni_nie ?? c.telefono ?? ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {resultados.polizas.length > 0 && (
          <CommandGroup heading="Pólizas">
            {resultados.polizas.map((p) => (
              <CommandItem
                key={p.id}
                value={`poliza-${p.id}`}
                onSelect={() => irA(`/polizas/${p.id}`)}
              >
                <FileText className="size-4" />
                <span className="font-medium">{p.numero_poliza}</span>
                <span className="text-muted-foreground text-xs">
                  {p.compania}
                  {p.matricula ? ` · ${p.matricula}` : ""}
                </span>
                <span className="text-muted-foreground ml-auto text-xs">
                  vence {formatFecha(p.fecha_vencimiento)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(resultados.clientes.length > 0 || resultados.polizas.length > 0) && (
          <CommandSeparator />
        )}

        <CommandGroup heading="Ir a">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.href}
                value={`nav-${item.label}`}
                onSelect={() => irA(item.href)}
              >
                <Icon className="size-4" />
                {item.label}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
