"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cambiarEstadoCorreduria } from "./actions"

export function CorreduriaFila({
  id,
  nombre,
  activa,
  visibilidad,
  alta,
}: {
  id: string
  nombre: string
  activa: boolean
  visibilidad: string
  alta: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function toggle() {
    setPending(true)
    const res = await cambiarEstadoCorreduria(id, !activa)
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo actualizar")
      return
    }
    toast.success(activa ? "Correduría desactivada" : "Correduría activada")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Building2 className="text-muted-foreground size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{nombre}</span>
          {!activa && <Badge variant="outline">inactiva</Badge>}
        </div>
        <p className="text-muted-foreground text-xs">
          {visibilidad} · alta {alta}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {activa ? "Desactivar" : "Activar"}
      </Button>
    </div>
  )
}
