"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2, Trash2, ShieldAlert } from "lucide-react"
import {
  TIPO_SINIESTRO_LABEL,
  TIPO_SINIESTRO_OPTIONS,
  ESTADO_SINIESTRO_OPTIONS,
  TIPO_POLIZA_LABEL,
  type TipoSiniestro,
  type EstadoSiniestro,
  type TipoPoliza,
} from "@/lib/constants"
import { formatFecha, formatEuros } from "@/lib/format"
import type { SiniestroConRelaciones } from "@/lib/database.types"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SelectSimple } from "@/components/ui/select-field"
import { EstadoSiniestroBadge } from "@/components/badges"
import {
  crearSiniestro,
  cambiarEstadoSiniestro,
  eliminarSiniestro,
} from "@/app/(app)/siniestros/actions"

export interface PolizaOpcion {
  id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
}

export function SiniestrosTab({
  clienteId,
  polizas,
  siniestros,
}: {
  clienteId: string
  polizas: PolizaOpcion[]
  siniestros: SiniestroConRelaciones[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState<SiniestroConRelaciones[]>(siniestros)
  const [polizaId, setPolizaId] = React.useState(polizas[0]?.id ?? "")
  const [tipo, setTipo] = React.useState<TipoSiniestro>("danos")
  const [numero, setNumero] = React.useState("")
  const [fechaOcurrencia, setFechaOcurrencia] = React.useState("")
  const [importe, setImporte] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [guardando, setGuardando] = React.useState(false)
  const [pending, setPending] = React.useState<string | null>(null)

  React.useEffect(() => setItems(siniestros), [siniestros])

  const polizaOptions = React.useMemo(
    () =>
      polizas.map((p) => ({
        value: p.id,
        label: `${p.compania} · ${TIPO_POLIZA_LABEL[p.tipo]} · ${p.numero_poliza}`,
      })),
    [polizas]
  )

  async function guardar() {
    if (!polizaId) {
      toast.error("Selecciona una póliza")
      return
    }
    setGuardando(true)
    const res = await crearSiniestro({
      cliente_id: clienteId,
      poliza_id: polizaId,
      tipo,
      numero_siniestro: numero || undefined,
      fecha_ocurrencia: fechaOcurrencia || undefined,
      importe_estimado: importe || undefined,
      descripcion: descripcion || undefined,
    })
    setGuardando(false)
    if (!res.ok || !res.siniestro) {
      toast.error(res.error ?? "No se pudo crear")
      return
    }
    const poliza = polizas.find((p) => p.id === polizaId) ?? null
    setItems((prev) => [
      {
        ...res.siniestro!,
        cliente: null,
        poliza: poliza
          ? { id: poliza.id, compania: poliza.compania, numero_poliza: poliza.numero_poliza, tipo: poliza.tipo }
          : null,
      },
      ...prev,
    ])
    setNumero("")
    setFechaOcurrencia("")
    setImporte("")
    setDescripcion("")
    toast.success("Siniestro registrado")
    router.refresh()
  }

  async function cambiarEstado(id: string, estado: EstadoSiniestro) {
    setPending(id)
    const res = await cambiarEstadoSiniestro(id, estado)
    setPending(null)
    if (!res.ok || !res.siniestro) {
      toast.error(res.error ?? "No se pudo actualizar")
      return
    }
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, estado } : s)))
    toast.success("Estado actualizado")
  }

  async function borrar(id: string) {
    setPending(id)
    const res = await eliminarSiniestro(id)
    setPending(null)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo eliminar")
      return
    }
    setItems((prev) => prev.filter((s) => s.id !== id))
    toast.success("Siniestro eliminado")
  }

  if (polizas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Este cliente no tiene pólizas. Un siniestro debe ir asociado a una póliza.
      </p>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Alta */}
      <Card>
        <CardContent className="grid gap-3 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectSimple
              value={polizaId}
              onValueChange={setPolizaId}
              options={polizaOptions}
              placeholder="Póliza afectada"
            />
            <SelectSimple
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoSiniestro)}
              options={TIPO_SINIESTRO_OPTIONS}
            />
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Nº de siniestro (compañía)"
            />
            <Input
              type="date"
              value={fechaOcurrencia}
              onChange={(e) => setFechaOcurrencia(e.target.value)}
              aria-label="Fecha de ocurrencia"
            />
            <Input
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="Importe estimado (€)"
              inputMode="decimal"
            />
          </div>
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Descripción de lo ocurrido…"
          />
          <div>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Registrar siniestro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay siniestros registrados para este cliente.
        </p>
      ) : (
        <div className="grid gap-2">
          {items.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg border p-3 ${pending === s.id ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldAlert className="text-muted-foreground size-4 shrink-0" />
                    <span className="font-medium">{TIPO_SINIESTRO_LABEL[s.tipo]}</span>
                    {s.numero_siniestro && (
                      <span className="text-muted-foreground font-mono text-xs">
                        {s.numero_siniestro}
                      </span>
                    )}
                    <EstadoSiniestroBadge estado={s.estado} />
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    {s.poliza && (
                      <span>
                        {s.poliza.compania} · {s.poliza.numero_poliza}
                      </span>
                    )}
                    {s.fecha_ocurrencia && <span>Ocurrido: {formatFecha(s.fecha_ocurrencia)}</span>}
                    <span>Apertura: {formatFecha(s.fecha_apertura)}</span>
                    {s.importe_estimado != null && (
                      <span>Estimado: {formatEuros(s.importe_estimado)}</span>
                    )}
                    {s.importe_indemnizado != null && (
                      <span>Indemnizado: {formatEuros(s.importe_indemnizado)}</span>
                    )}
                  </div>
                  {s.descripcion && (
                    <p className="mt-1 text-sm whitespace-pre-wrap">{s.descripcion}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <SelectSimple
                      value={s.estado}
                      onValueChange={(v) => cambiarEstado(s.id, v as EstadoSiniestro)}
                      options={ESTADO_SINIESTRO_OPTIONS}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    aria-label="Eliminar siniestro"
                    disabled={pending === s.id}
                    onClick={() => borrar(s.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
