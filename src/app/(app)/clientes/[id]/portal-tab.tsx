"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { crearAccesoPortal, revocarAccesoPortal } from "./portal-actions"

export interface AccesoPortal {
  userId: string
  email: string
}

export function PortalTab({
  clienteId,
  acceso,
  defaultEmail,
}: {
  clienteId: string
  acceso: AccesoPortal | null
  defaultEmail?: string
}) {
  const router = useRouter()
  const [email, setEmail] = React.useState(defaultEmail ?? "")
  const [password, setPassword] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function crear() {
    if (!email.trim() || !password) {
      toast.error("Email y contraseña obligatorios.")
      return
    }
    setPending(true)
    const res = await crearAccesoPortal({ clienteId, email, password })
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo crear.")
      return
    }
    setPassword("")
    toast.success("Acceso al portal creado")
    router.refresh()
  }

  async function revocar() {
    if (!acceso) return
    setPending(true)
    const res = await revocarAccesoPortal({ clienteId, userId: acceso.userId })
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo revocar.")
      return
    }
    toast.success("Acceso revocado")
    router.refresh()
  }

  return (
    <div className="grid max-w-xl gap-4">
      <p className="text-muted-foreground text-sm">
        El portal permite al cliente consultar sus pólizas y descargar su
        documentación en <span className="font-medium">solo lectura</span>. No ve
        datos internos, ni de otros clientes.
      </p>

      {acceso ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Acceso activo</p>
              <p className="text-muted-foreground truncate text-sm">{acceso.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={revocar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Revocar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="size-4" /> Crear acceso al portal
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email del cliente"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña temporal (mín. 8)"
            />
            <div>
              <Button onClick={crear} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Crear acceso
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Comunica la contraseña al cliente; podrá cambiarla desde el portal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
