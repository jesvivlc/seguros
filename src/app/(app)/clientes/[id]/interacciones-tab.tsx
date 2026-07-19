"use client"

import type { InteraccionConPoliza } from "@/lib/database.types"
import type { TipoPoliza } from "@/lib/constants"

export interface PolizaOpcion {
  id: string
  compania: string
  tipo: TipoPoliza
  numero_poliza: string
}

// Stub — se implementa en el bloque 5 (timeline de interacciones).
export function InteraccionesTab(_props: {
  clienteId: string
  polizas: PolizaOpcion[]
  interacciones: InteraccionConPoliza[]
}) {
  return (
    <p className="text-muted-foreground text-sm">
      El timeline de interacciones se construye en el bloque 5.
    </p>
  )
}
