# Roadmap

Planificación a futuro del CRM. Lo aquí descrito **no** forma parte de la Fase 1
actual ni debe implementarse todavía.

## Automatizaciones n8n (futuras — NO implementadas)

Criterio: n8n solo se usa para orquestar servicios externos sin integración nativa. Lo interno (renovaciones, cumpleaños) se queda en Postgres + cron, nunca en n8n. Regla: si los datos no salen del stack Supabase/Vercel, no se mete n8n.

Prioridad 1 — Control propio (montar en cuanto la Fase 1 esté estable en producción):
- Alerta de fallo del cron: si el job diario de renovaciones falla (401, timeout, error SQL), avisar a Bruno por Telegram/email. Que falle en silencio es el peor escenario en una app anti-olvidos.
- Backup diario de la BBDD: pg_dump a las 3:00 → Drive/S3. Respuesta a la objeción "¿y si pierdo mi cartera?".

Prioridad 2 — Valor para la clienta:
- Entrada de documentos por email: reenviar correo con póliza adjunta a dirección dedicada → n8n lee IMAP → sube el adjunto al bucket del cliente correcto → crea interacción "documento recibido".
- Ingesta de bandeja como interacciones: emails con clientes registrados automáticamente en el timeline.

Prioridad 3 — Requiere resolver tema legal primero:
- Envío real de WhatsApp de renovación: webhook Supabase → n8n formatea desde plantilla → envía (Whapi/360dialog/Evolution API) → escribe de vuelta en interacciones. Bloqueante legal (plantillas aprobadas por Meta + consentimiento del cliente), no técnico. El deep link wa.me cubre el interino.
- Pipeline de comparativa asíncrono (Fase 2): PDF → API Anthropic extrae JSON → genera PDF comparativo → Storage → notifica. Solo si el volumen lo justifica.

NO usar n8n para: renovaciones y cumpleaños (ya en cron), motor de oportunidades cross-sell (lógica de negocio interna), cualquier CRUD interno.
