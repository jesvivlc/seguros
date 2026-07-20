"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { login, type LoginState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: LoginState = { error: null }

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="redirect" value={redirectTo} />

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="asesora@correduria.es"
          required
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/auth/recuperar"
            className="text-muted-foreground text-xs hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Accediendo…
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" />
            Entrar
          </>
        )}
      </Button>
    </form>
  )
}
