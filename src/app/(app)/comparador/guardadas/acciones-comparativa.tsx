"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { eliminarComparativa } from "../actions"

export function EliminarComparativaButton({
  id,
  titulo,
  volverA = "/comparador/guardadas",
}: {
  id: string
  titulo: string
  volverA?: string
}) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="icon" aria-label="Eliminar comparativa">
          <Trash2 className="size-4" />
        </Button>
      }
      title={`¿Eliminar «${titulo}»?`}
      description="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      destructive
      onConfirm={async () => {
        const res = await eliminarComparativa(id)
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo eliminar")
          throw new Error(res.error)
        }
        toast.success("Comparativa eliminada")
        router.push(volverA)
        router.refresh()
      }}
    />
  )
}
