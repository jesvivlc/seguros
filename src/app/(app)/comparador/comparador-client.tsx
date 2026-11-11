"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { UploadCloud, Loader2, Sparkles, FileText, X, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComparativaView } from "@/components/comparativa-view"
import { ClienteCombobox, type ClienteOpcion } from "@/components/cliente-combobox"
import type { ComparativaDatos } from "@/lib/database.types"
import { guardarComparativa } from "./actions"

export function ComparadorClient({ clientes }: { clientes: ClienteOpcion[] }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [files, setFiles] = React.useState<File[]>([])
  const [dragOver, setDragOver] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)
  const [res, setRes] = React.useState<ComparativaDatos | null>(null)

  // Guardado
  const [titulo, setTitulo] = React.useState("")
  const [clienteId, setClienteId] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)
  const [guardadaId, setGuardadaId] = React.useState<string | null>(null)

  function añadir(nuevos: FileList | File[]) {
    const pdfs = Array.from(nuevos).filter((f) => f.type === "application/pdf")
    if (pdfs.length !== Array.from(nuevos).length) {
      toast.error("Solo se aceptan archivos PDF.")
    }
    setFiles((prev) => [...prev, ...pdfs].slice(0, 4))
  }
  function quitar(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function comparar() {
    if (files.length < 2) {
      toast.error("Sube al menos 2 pólizas para comparar.")
      return
    }
    setCargando(true)
    setRes(null)
    setGuardadaId(null)
    const fd = new FormData()
    for (const f of files) fd.append("pdfs", f)
    try {
      const r = await fetch("/api/comparador", { method: "POST", body: fd })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error ?? "No se pudo comparar.")
        return
      }
      const comparativa = data.comparativa as ComparativaDatos
      setRes(comparativa)
      setTitulo(
        `Comparativa ${comparativa.polizas.map((p) => p.compania).join(" / ")}`.slice(0, 200)
      )
      toast.success("Comparativa generada")
    } catch {
      toast.error("Error de red al comparar.")
    } finally {
      setCargando(false)
    }
  }

  async function guardar() {
    if (!res) return
    setGuardando(true)
    const r = await guardarComparativa({ titulo, cliente_id: clienteId, datos: res })
    setGuardando(false)
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar.")
      return
    }
    setGuardadaId(r.id ?? null)
    toast.success("Comparativa guardada")
  }

  return (
    <div className="grid gap-6">
      {/* Subida */}
      <Card>
        <CardContent className="grid gap-3 pt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files.length) añadir(e.dataTransfer.files)
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-muted/50" : "border-muted-foreground/25"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && añadir(e.target.files)}
            />
            <UploadCloud className="text-muted-foreground size-6" />
            <p className="text-sm">
              Arrastra 2–4 condicionados en PDF o{" "}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                selecciónalos
              </button>
            </p>
            <p className="text-muted-foreground text-xs">
              La IA lee los PDF y genera una tabla comparativa de coberturas.
            </p>
          </div>

          {files.length > 0 && (
            <div className="grid gap-2">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => quitar(i)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Quitar"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Button onClick={comparar} disabled={cargando || files.length < 2}>
              {cargando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {cargando ? "Analizando pólizas…" : "Comparar con IA"}
            </Button>
            {cargando && (
              <p className="text-muted-foreground mt-2 text-xs">
                Puede tardar hasta un minuto según el tamaño de los PDF.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {res && (
        <div className="grid gap-4">
          <Card>
            <CardContent className="grid gap-3 pt-6">
              <h3 className="text-sm font-medium">Guardar para el cliente</h3>
              {guardadaId ? (
                <p className="text-sm">
                  Guardada.{" "}
                  <Link
                    href={`/comparador/guardadas/${guardadaId}`}
                    className="text-primary font-medium hover:underline"
                  >
                    Abrir y descargar el PDF
                  </Link>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={200}
                    placeholder="Título de la comparativa"
                    aria-label="Título"
                  />
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <ClienteCombobox
                        value={clienteId}
                        onValueChange={setClienteId}
                        options={clientes}
                        placeholder="Cliente (opcional)"
                      />
                    </div>
                    {clienteId && (
                      <Button variant="ghost" size="sm" onClick={() => setClienteId(null)}>
                        Quitar
                      </Button>
                    )}
                  </div>
                  <Button onClick={guardar} disabled={guardando || !titulo.trim()}>
                    {guardando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ComparativaView res={res} />
        </div>
      )}
    </div>
  )
}
