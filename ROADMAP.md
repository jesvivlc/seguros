# Roadmap

Planificación a futuro del CRM. Lo aquí descrito **no** forma parte de la Fase 1
actual ni debe implementarse todavía.

## Automatizaciones (estado — actualizado 2026-07-21)

Criterio: n8n solo se usa para orquestar servicios externos sin integración nativa. Lo interno (renovaciones, cumpleaños) se queda en Postgres + cron, nunca en n8n. Regla: si los datos no salen del stack Supabase/Vercel, no se mete n8n.

**Nota importante**: al integrar **Resend**, todo lo que era *enviar email* pasó a ser
**nativo** (la app llama a Resend directamente) — exactamente lo que pide la regla de
arriba. Así que varios ítems que se habían pensado para n8n ya están hechos sin n8n.

Prioridad 1 — Control propio:
- ✅ **HECHO (nativo, Resend)** — Alerta de fallo del cron: si `run_daily_jobs` falla, avisa por email a `ALERT_EMAIL`.
- ⏳ Backup diario de la BBDD: Supabase ya hace backups automáticos según plan. Si se quiere un `pg_dump` propio → Drive/S3, sería una **GitHub Action** programada, no n8n.

Prioridad 2 — Valor para la clienta:
- ✅ **HECHO (nativo, Resend)** — Recordatorio de renovación al cliente por email (a 30 y 7 días del vencimiento, desde el cron). Cubre el valor del "WhatsApp de renovación" sin bloqueo legal.
- ⏳ **PENDIENTE — único ítem que sigue siendo n8n de verdad**: **entrada de documentos por email (inbound)**. Reenviar/enviar un correo con la póliza adjunta a una dirección dedicada → n8n lee IMAP (o un servicio con inbound-parse) → sube el adjunto al bucket del cliente correcto → crea interacción "documento recibido". Resend *envía* pero no *recibe*, por eso esto necesita n8n+IMAP. **Dejado para futuro.**
- ⏳ Ingesta de bandeja como interacciones (misma vía inbound): emails con clientes registrados automáticamente en el timeline. Futuro, junto al ítem anterior.

Prioridad 3 — Requiere resolver tema legal primero:
- ⛔ Envío real de WhatsApp de renovación: webhook Supabase → n8n → Whapi/360dialog/Evolution API → escribe de vuelta en interacciones. **Bloqueante legal** (plantillas aprobadas por Meta + consentimiento), no técnico. El deep link wa.me cubriría el interino. El recordatorio por email ya cubre la necesidad mientras tanto.
- ✅/⏳ Comparador de pólizas con IA: el comparador **síncrono ya está hecho** (`/comparador`, PDF → Anthropic → tabla). La versión **asíncrona** (generar un PDF comparativo y notificar) queda para futuro, solo si el volumen lo justifica.

NO usar n8n para: renovaciones, cumpleaños y recordatorios (ya en cron + Resend), motor de oportunidades cross-sell (lógica de negocio interna), cualquier CRUD interno.
