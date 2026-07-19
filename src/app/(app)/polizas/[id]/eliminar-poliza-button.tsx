"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { eliminarPoliza } from "../actions"

export function EliminarPolizaButton({
  id,
  numero,
  clienteId,
}: {
  id: string
  numero: string
  clienteId: string
}) {
  const router = useRouter()

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="icon" aria-label="Eliminar póliza">
          <Trash2 className="size-4" />
        </Button>
      }
      title={`¿Eliminar la póliza ${numero}?`}
      description="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      destructive
      onConfirm={async () => {
        const res = await eliminarPoliza(id)
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo eliminar")
          throw new Error(res.error)
        }
        toast.success("Póliza eliminada")
        router.push(`/clientes/${clienteId}`)
        router.refresh()
      }}
    />
  )
}
