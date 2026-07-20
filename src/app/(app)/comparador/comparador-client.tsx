"use client"

import * as React from "react"
import { toast } from "sonner"
import { UploadCloud, Loader2, Sparkles, FileText, X, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Comparativa {
  polizas: { etiqueta: string; compania: string; tipo: string; prima_anual: string }[]
  filas: { concepto: string; valores: string[]; observacion: string }[]
  diferencias_clave: string[]
  recomendacion: string
}

export function ComparadorClient() {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [files, setFiles] = React.useState<File[]>([])
  const [dragOver, setDragOver] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)
  const [res, setRes] = React.useState<Comparativa | null>(null)

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
    const fd = new FormData()
    for (const f of files) fd.append("pdfs", f)
    try {
      const r = await fetch("/api/comparador", { method: "POST", body: fd })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error ?? "No se pudo comparar.")
        return
      }
      setRes(data.comparativa as Comparativa)
      toast.success("Comparativa generada")
    } catch {
      toast.error("Error de red al comparar.")
    } finally {
      setCargando(false)
    }
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
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Cobertura</TableHead>
                  {res.polizas.map((p, i) => (
                    <TableHead key={i}>
                      <div className="font-medium">{p.compania}</div>
                      <div className="text-muted-foreground text-xs font-normal">
                        {p.tipo} · {p.prima_anual}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {res.filas.map((fila, i) => (
                  <TableRow key={i}>
                    <TableCell className="align-top font-medium">
                      {fila.concepto}
                      {fila.observacion && (
                        <div className="text-muted-foreground text-xs font-normal">
                          {fila.observacion}
                        </div>
                      )}
                    </TableCell>
                    {fila.valores.map((v, j) => (
                      <TableCell key={j} className="align-top">
                        {v}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {res.diferencias_clave.length > 0 && (
            <Card>
              <CardContent className="grid gap-2 pt-6">
                <h3 className="text-sm font-medium">Diferencias clave</h3>
                <ul className="text-muted-foreground grid list-disc gap-1 pl-5 text-sm">
                  {res.diferencias_clave.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {res.recomendacion && (
            <Card>
              <CardContent className="flex gap-3 pt-6">
                <Lightbulb className="text-amber-500 mt-0.5 size-5 shrink-0" />
                <div>
                  <h3 className="text-sm font-medium">Recomendación (orientativa)</h3>
                  <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                    {res.recomendacion}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground text-xs">
            Generado por IA a partir de los PDF. Revisa siempre el condicionado
            original: puede haber matices que la extracción automática no capte.
          </p>
        </div>
      )}
    </div>
  )
}
