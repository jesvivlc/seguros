"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Download, Loader2, UploadCloud } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatFechaHora, formatTamano } from "@/lib/format"
import { CATEGORIA_DOCUMENTO_LABEL, type CategoriaDocumento } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUrlDescargaPortal, registrarDocumentoPortal } from "./actions"

const BUCKET = "documentos"

function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

export interface DocPortal {
  id: string
  nombre: string
  categoria: CategoriaDocumento
  storage_path: string
  tamano_bytes: number | null
  created_at: string
}

export function DocumentosPortal({
  clienteId,
  correduriaId,
  documentos,
}: {
  clienteId: string
  correduriaId: string
  documentos: DocPortal[]
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState<string | null>(null)
  const [subiendo, setSubiendo] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)

  async function descargar(doc: DocPortal) {
    setPending(doc.id)
    const res = await getUrlDescargaPortal(doc.storage_path)
    setPending(null)
    if (!res.ok || !res.url) {
      toast.error(res.error ?? "No se pudo descargar.")
      return
    }
    window.open(res.url, "_blank", "noopener,noreferrer")
  }

  async function subir(files: FileList | File[]) {
    const lista = Array.from(files)
    if (lista.length === 0) return
    const supabase = createClient()
    setSubiendo(true)
    for (const file of lista) {
      const path = `${correduriaId}/${clienteId}/${Date.now()}-${nombreSeguro(file.name)}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (upErr) {
        toast.error(`No se pudo subir «${file.name}».`)
        continue
      }
      const res = await registrarDocumentoPortal({
        nombre: file.name,
        storage_path: path,
        mime_type: file.type || null,
        tamano_bytes: file.size,
      })
      if (!res.ok) {
        await supabase.storage.from(BUCKET).remove([path])
        toast.error(res.error ?? `No se pudo registrar «${file.name}».`)
        continue
      }
      toast.success(`«${file.name}» subido`)
    }
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) subir(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-muted/50" : "border-muted-foreground/25"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subir(e.target.files)}
        />
        {subiendo ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : (
          <UploadCloud className="text-muted-foreground size-5" />
        )}
        <p className="text-sm">
          Arrastra un archivo o{" "}
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            súbelo
          </button>{" "}
          a tu correduría
        </p>
      </div>

      {documentos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay documentos disponibles todavía.
        </p>
      ) : (
        <div className="grid gap-2">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.nombre}</p>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                  <Badge variant="outline">{CATEGORIA_DOCUMENTO_LABEL[doc.categoria]}</Badge>
                  <span className="tabular-nums">{formatTamano(doc.tamano_bytes)}</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatFechaHora(doc.created_at)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descargar"
                disabled={pending === doc.id}
                onClick={() => descargar(doc)}
              >
                {pending === doc.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
