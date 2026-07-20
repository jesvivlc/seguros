"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, KeyRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cambiarPassword } from "./actions"

export function CuentaClient() {
  const router = useRouter()
  const [p1, setP1] = React.useState("")
  const [p2, setP2] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function guardar() {
    if (p1.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (p1 !== p2) {
      toast.error("Las contraseñas no coinciden.")
      return
    }
    setPending(true)
    const res = await cambiarPassword(p1)
    setPending(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo cambiar.")
      return
    }
    setP1("")
    setP2("")
    toast.success("Contraseña actualizada")
    router.push("/")
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Nueva contraseña</label>
        <Input
          type="password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Repite la contraseña</label>
        <Input
          type="password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && guardar()}
          autoComplete="new-password"
        />
      </div>
      <div>
        <Button onClick={guardar} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Cambiar contraseña
        </Button>
      </div>
    </div>
  )
}
