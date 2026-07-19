"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export interface LoginState {
  error: string | null
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const redirectTo = String(formData.get("redirect") ?? "/") || "/"

  if (!email || !password) {
    return { error: "Introduce el email y la contraseña." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Credenciales incorrectas. Revisa el email y la contraseña." }
  }

  // Redirige a la ruta solicitada (o al dashboard). El redirect debe ser interno.
  redirect(redirectTo.startsWith("/") ? redirectTo : "/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
