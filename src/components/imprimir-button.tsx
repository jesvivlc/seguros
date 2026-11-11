"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Abre el diálogo de impresión del navegador (permite «Guardar como PDF»). */
export function ImprimirButton({ label = "Descargar PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </Button>
  )
}
