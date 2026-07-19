"use client"

import type { DocumentoRow } from "@/lib/database.types"

// Stub — se implementa en el bloque 10 (documentos + Storage).
export function DocumentosTab(_props: {
  clienteId: string
  documentos: DocumentoRow[]
}) {
  return (
    <p className="text-muted-foreground text-sm">
      La gestión documental se construye en el bloque 10.
    </p>
  )
}
