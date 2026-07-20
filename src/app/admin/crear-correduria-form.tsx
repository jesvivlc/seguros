"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { crearCorreduria } from "./actions"

export function CrearCorreduriaForm() {
  const router = useRouter()
  const [nombre, setNombre] = React.useState("")
  const [adminNombre, setAdminNombre] = React.useState("")
  const [adminEmail, setAdminEmail] = React.useState("")
  const [adminPassword, setAdminPassword] = React.useState("")
  const [guardando, setGuardando] = React.useState(false)

  async function guardar() {
    if (!nombre.trim() || !adminEmail.trim() || !adminPassword) {
      toast.error("Rellena nombre de correduría, email y contraseña del admin.")
      return
    }
    setGuardando(true)
    const res = await crearCorreduria({ nombre, adminNombre, adminEmail, adminPassword })
    setGuardando(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo crear.")
      return
    }
    setNombre("")
    setAdminNombre("")
    setAdminEmail("")
    setAdminPassword("")
    toast.success("Correduría creada")
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <label className="text-xs font-medium">Nombre de la correduría</label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Correduría Ejemplo S.L."
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium">Nombre del admin (opcional)</label>
          <Input
            value={adminNombre}
            onChange={(e) => setAdminNombre(e.target.value)}
            placeholder="Nombre y apellidos"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium">Email del admin</label>
          <Input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@correduria.com"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium">Contraseña temporal (mín. 8)</label>
          <Input
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Contraseña que comunicarás al admin"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={guardar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Crear correduría + admin
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
