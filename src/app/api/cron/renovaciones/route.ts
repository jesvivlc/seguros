import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Job diario: marca pólizas vencidas y genera tareas de renovación y cumpleaños.
 * Protegido con CRON_SECRET (cabecera Authorization: Bearer <secret>).
 * Lo invoca Vercel Cron (ver vercel.json). Alternativa a pg_cron.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("run_daily_jobs")
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true, resultado: data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
