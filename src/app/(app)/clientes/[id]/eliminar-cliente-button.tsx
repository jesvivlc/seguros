"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { eliminarCliente } from "../actions"

export function EliminarClienteButton({
  id,
  nombre,
}: {
  id: string
  nombre: string
}) {
  const router = useRouter()

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="icon" aria-label="Eliminar cliente">
          <Trash2 className="size-4" />
        </Button>
      }
      title={`¿Eliminar a ${nombre}?`}
      description="Esta acción no se puede deshacer. Se borrarán también sus interacciones, tareas y documentos. No podrás eliminarlo si tiene pólizas."
      confirmLabel="Eliminar"
      destructive
      onConfirm={async () => {
        const res = await eliminarCliente(id)
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo eliminar")
          throw new Error(res.error)
        }
        toast.success("Cliente eliminado")
        router.push("/clientes")
        router.refresh()
      }}
    />
  )
}
