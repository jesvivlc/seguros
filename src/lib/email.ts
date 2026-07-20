import "server-only"

const FROM = process.env.EMAIL_FROM ?? "CRM Seguros <onboarding@resend.dev>"

export interface EmailInput {
  to: string | string[]
  subject: string
  html: string
}

/** Envía un email vía Resend. Devuelve ok/error (no lanza). */
export async function enviarEmail(
  input: EmailInput
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: "RESEND_API_KEY no configurada." }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${txt.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" }
  }
}

/** Envoltorio HTML sencillo y sobrio para los emails del CRM. */
export function plantillaEmail(titulo: string, cuerpo: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 12px;font-size:18px">${titulo}</h1>
    ${cuerpo}
  </div>
  <p style="color:#a1a1aa;font-size:12px;margin:16px 4px 0">CRM Correduría de Seguros</p>
</div></body></html>`
}
