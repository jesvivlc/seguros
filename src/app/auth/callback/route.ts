import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Intercambia el `code` del enlace de email por una sesión y redirige.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/login?error=enlace", url.origin))
    }
  }
  return NextResponse.redirect(new URL(next, url.origin))
}
