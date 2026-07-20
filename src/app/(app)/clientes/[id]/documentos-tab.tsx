"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  CATEGORIA_DOCUMENTO_OPTIONS,
  CATEGORIA_DOCUMENTO_LABEL,
  type CategoriaDocumento,
} from "@/lib/constants"
import { formatFechaHora, formatTamano } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DocumentoRow } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectSimple } from "@/components/ui/select-field"
import {
  registrarDocumento,
  getUrlDescarga,
  eliminarDocumento,
} from "./documentos-actions"

const BUCKET = "documentos"

/** Normaliza el nombre para usarlo como clave en Storage (sin acentos/espacios). */
function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function DocumentosTab({
  clienteId,
  correduriaId,
  documentos,
}: {
  clienteId: string
  correduriaId: string
  documentos: DocumentoRow[]
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [items, setItems] = React.useState<DocumentoRow[]>(documentos)
  const [categoria, setCategoria] = React.useState<CategoriaDocumento>("poliza")
  const [subiendo, setSubiendo] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [descargando, setDescargando] = React.useState<string | null>(null)
  const [borrando, setBorrando] = React.useState<string | null>(null)

  React.useEffect(() => setItems(documentos), [documentos])

  async function subir(files: FileList | File[]) {
    const lista = Array.from(files)
    if (lista.length === 0) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Sesión no válida. Vuelve a iniciar sesión.")
      return
    }

    setSubiendo(true)
    for (const file of lista) {
      // Ruta {correduria_id}/{cliente_id}/{archivo}: la RLS de Storage exige que
      // la primera carpeta sea la correduría del usuario.
      const path = `${correduriaId}/${clienteId}/${Date.now()}-${nombreSeguro(file.name)}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (upErr) {
        toast.error(`No se pudo subir «${file.name}».`)
        continue
      }

      const res = await registrarDocumento({
        cliente_id: clienteId,
        categoria,
        nombre: file.name,
        storage_path: path,
        mime_type: file.type || null,
        tamano_bytes: file.size,
      })

      if (!res.ok || !res.documento) {
        // Rollback: si no se pudo registrar, quitamos el archivo huérfano.
        await supabase.storage.from(BUCKET).remove([path])
        toast.error(res.error ?? `No se pudo registrar «${file.name}».`)
        continue
      }

      setItems((prev) => [res.documento!, ...prev])
      toast.success(`«${file.name}» subido`)
    }
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  async function descargar(doc: DocumentoRow) {
    setDescargando(doc.id)
    const res = await getUrlDescarga(doc.storage_path)
    setDescargando(null)
    if (!res.ok || !res.url) {
      toast.error(res.error ?? "No se pudo generar el enlace de descarga.")
      return
    }
    // Signed URL de 60 s; se abre en pestaña nueva, nunca es URL pública.
    window.open(res.url, "_blank", "noopener,noreferrer")
  }

  async function borrar(doc: DocumentoRow) {
    setBorrando(doc.id)
    const res = await eliminarDocumento(doc.id)
    setBorrando(null)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo eliminar.")
      return
    }
    setItems((prev) => prev.filter((d) => d.id !== doc.id))
    toast.success("Documento eliminado")
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      {/* Zona de subida */}
      <div className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-muted-foreground text-sm">Categoría:</span>
          <div className="sm:w-64">
            <SelectSimple
              value={categoria}
              onValueChange={(v) => setCategoria(v as CategoriaDocumento)}
              options={CATEGORIA_DOCUMENTO_OPTIONS}
            />
          </div>
        </div>

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
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
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
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          ) : (
            <UploadCloud className="text-muted-foreground size-6" />
          )}
          <p className="text-sm">
            Arrastra archivos aquí o{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
            >
              selecciónalos
            </button>
          </p>
          <p className="text-muted-foreground text-xs">
            Se guardarán en la categoría «{CATEGORIA_DOCUMENTO_LABEL[categoria]}»
          </p>
        </div>
      </div>

      {/* Listado */}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no hay documentos para este cliente.
        </p>
      ) : (
        <div className="grid gap-2">
          {items.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <FileText className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.nombre}</p>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <Badge variant="outline">
                    {CATEGORIA_DOCUMENTO_LABEL[doc.categoria]}
                  </Badge>
                  <span className="tabular-nums">{formatTamano(doc.tamano_bytes)}</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatFechaHora(doc.created_at)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descargar"
                disabled={descargando === doc.id}
                onClick={() => descargar(doc)}
              >
                {descargando === doc.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label="Eliminar"
                disabled={borrando === doc.id}
                onClick={() => borrar(doc)}
              >
                {borrando === doc.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
