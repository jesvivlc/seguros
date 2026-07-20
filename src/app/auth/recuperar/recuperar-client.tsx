"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { enviarRecuperacion } from "./actions"

export function RecuperarClient() {
  const [email, setEmail] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [enviado, setEnviado] = React.useState(false)

  async function enviar() {
    if (!email.trim()) {
      toast.error("Introduce tu email.")
      return
    }
    setPending(true)
    await enviarRecuperacion(email.trim())
    setPending(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <p className="text-sm">
          Si el email existe, te hemos enviado un enlace para restablecer la
          contraseña. Revisa tu bandeja de entrada.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && enviar()}
        placeholder="tu@email.com"
        autoComplete="email"
      />
      <Button onClick={enviar} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        Enviar enlace de recuperación
      </Button>
    </div>
  )
}
