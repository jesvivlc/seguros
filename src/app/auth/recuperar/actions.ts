"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, plantillaEmail } from "@/lib/email"

/**
 * Genera un enlace de recuperación (admin API) y lo envía por email con Resend.
 * Por seguridad devuelve siempre ok (no revela si el email existe).
 */
export async function enviarRecuperacion(email: string): Promise<{ ok: boolean }> {
  const correo = email.trim()
  if (!correo) return { ok: true }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: correo,
    options: { redirectTo: `${site}/auth/callback?next=/auth/actualizar` },
  })

  const link = data?.properties?.action_link
  if (!error && link) {
    await enviarEmail({
      to: correo,
      subject: "Restablece tu contraseña — CRM Seguros",
      html: plantillaEmail(
        "Restablece tu contraseña",
        `<p>Has solicitado restablecer tu contraseña. Pulsa el botón para elegir una nueva:</p>
<p style="margin:20px 0"><a href="${link}" style="background:#18181b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Cambiar contraseña</a></p>
<p style="color:#71717a;font-size:12px">Si no lo solicitaste, ignora este email.</p>`
      ),
    })
  }
  return { ok: true }
}
