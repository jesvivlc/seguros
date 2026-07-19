"use client"

import type { TareaConRelaciones } from "@/lib/database.types"

// Stub — se implementa en el bloque 6 (tareas).
export function TareasTab(_props: {
  clienteId: string
  tareas: TareaConRelaciones[]
}) {
  return (
    <p className="text-muted-foreground text-sm">
      Las tareas del cliente se construyen en el bloque 6.
    </p>
  )
}
