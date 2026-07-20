import { NextResponse, type NextRequest } from "next/server"
import { addDays, format } from "date-fns"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, plantillaEmail } from "@/lib/email"
import { hoyZona } from "@/lib/timezone"
import { formatFecha } from "@/lib/format"
import { TIPO_POLIZA_LABEL, type TipoPoliza } from "@/lib/constants"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type Admin = ReturnType<typeof createAdminClient>

type PolizaRecordatorio = {
  compania: string
  tipo: TipoPoliza
  numero_poliza: string
  fecha_vencimiento: string
  cliente: { nombre: string; email: string | null } | null
  correduria: { nombre: string } | null
}

/** Envía recordatorios de renovación por email a 30 y 7 días del vencimiento. */
async function enviarRecordatorios(supabase: Admin) {
  const d30 = format(addDays(hoyZona(), 30), "yyyy-MM-dd")
  const d7 = format(addDays(hoyZona(), 7), "yyyy-MM-dd")

  const { data } = await supabase
    .from("polizas")
    .select(
      "compania, tipo, numero_poliza, fecha_vencimiento, cliente:clientes(nombre, email), correduria:corredurias(nombre)"
    )
    .eq("estado", "vigente")
    .in("fecha_vencimiento", [d30, d7])

  const polizas = (data ?? []) as unknown as PolizaRecordatorio[]
  let enviados = 0
  let fallidos = 0

  for (const p of polizas) {
    const email = p.cliente?.email
    if (!email) continue
    const dias = p.fecha_vencimiento === d7 ? 7 : 30
    const corr = p.correduria?.nombre ?? "tu correduría"
    const cuerpo = `<p>Hola ${p.cliente?.nombre ?? ""},</p>
<p>Te recordamos que tu póliza <strong>${p.compania} · ${TIPO_POLIZA_LABEL[p.tipo]}</strong>
(nº ${p.numero_poliza}) vence el <strong>${formatFecha(p.fecha_vencimiento)}</strong>
(en ${dias} días).</p>
<p>Si quieres renovarla o revisar las condiciones, contacta con <strong>${corr}</strong>.</p>`
    const res = await enviarEmail({
      to: email,
      subject: `Tu póliza ${p.compania} vence el ${formatFecha(p.fecha_vencimiento)}`,
      html: plantillaEmail("Recordatorio de renovación", cuerpo),
    })
    if (res.ok) enviados++
    else fallidos++
  }
  return { enviados, fallidos }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const alertTo = process.env.ALERT_EMAIL

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("run_daily_jobs")

    if (error) {
      if (alertTo) {
        await enviarEmail({
          to: alertTo,
          subject: "⚠️ Fallo del job diario del CRM",
          html: plantillaEmail(
            "Fallo del job diario",
            `<p>La función <code>run_daily_jobs</code> ha fallado:</p><pre style="background:#f4f4f5;padding:12px;border-radius:8px;white-space:pre-wrap">${error.message}</pre>`
          ),
        })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const recordatorios = await enviarRecordatorios(supabase)
    return NextResponse.json({ ok: true, resultado: data, recordatorios })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    if (alertTo) {
      await enviarEmail({
        to: alertTo,
        subject: "⚠️ Error en el cron del CRM",
        html: plantillaEmail("Error en el cron", `<pre>${msg}</pre>`),
      })
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
