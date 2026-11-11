"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { resumirCliente } from "./resumen-actions"

export function ResumenIa({ clienteId }: { clienteId: string }) {
  const [cargando, setCargando] = React.useState(false)
  const [texto, setTexto] = React.useState<string | null>(null)

  async function generar() {
    setCargando(true)
    const r = await resumirCliente(clienteId)
    setCargando(false)
    if (!r.ok || !r.texto) {
      toast.error(r.error ?? "No se pudo generar el resumen.")
      return
    }
    setTexto(r.texto)
  }

  return (
    <div className="mb-4 grid gap-2">
      <div>
        <Button variant="outline" size="sm" onClick={generar} disabled={cargando}>
          {cargando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {texto ? "Regenerar resumen" : "Resumen con IA"}
        </Button>
      </div>
      {texto && (
        <Card>
          <CardContent className="grid gap-2 pt-4">
            <p className="text-sm whitespace-pre-wrap">{texto}</p>
            <p className="text-muted-foreground text-xs">
              Generado por IA a partir del historial; revísalo antes de fiarte. Al generarlo
              no se envían el nombre, el documento ni los datos de contacto del cliente, y se
              redactan esos datos también en las notas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
