"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileText, Download, Loader2 } from "lucide-react"
import { formatFechaHora, formatTamano } from "@/lib/format"
import { CATEGORIA_DOCUMENTO_LABEL, type CategoriaDocumento } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUrlDescargaPortal } from "./actions"

export interface DocPortal {
  id: string
  nombre: string
  categoria: CategoriaDocumento
  storage_path: string
  tamano_bytes: number | null
  created_at: string
}

export function DocumentosPortal({ documentos }: { documentos: DocPortal[] }) {
  const [pending, setPending] = React.useState<string | null>(null)

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

  if (documentos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay documentos disponibles todavía.
      </p>
    )
  }

  return (
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
  )
}
