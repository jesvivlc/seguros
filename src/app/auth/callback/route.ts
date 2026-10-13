import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rutaInternaSegura } from "@/lib/url"

// Intercambia el `code` del enlace de email por una sesión y redirige.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = rutaInternaSegura(url.searchParams.get("next"))

  // Sin `code` no hay enlace que intercambiar. Redirigir igualmente a `next`
  // dejaría aquí un redirector interno abierto bajo /auth, que el matcher del
  // proxy deja público: serviría para dirigir el navegador ya autenticado de
  // alguien a cualquier ruta interna usando este dominio como trampolín.
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=enlace", url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL("/login?error=enlace", url.origin))
  }
  return NextResponse.redirect(new URL(next, url.origin))
}
