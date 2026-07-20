# Roadmap — CRM Correduría de Seguros

Estado del producto y planificación a futuro. Última actualización: 2026-07-21.
Contexto técnico completo en `PROYECTO.md`; detalle operativo en `NOTAS-PENDIENTES.md`.

---

## ✅ Entregado (en producción)

**Fase 1 (encargo original) — completa:**
clientes + ficha con pestañas · pólizas con editor de coberturas y semáforo · renovaciones
y cumpleaños automáticos (cron) · agenda mensual/semanal · timeline de interacciones ·
documentos (Storage privado + signed URLs) · buscador Cmd+K (tsvector + ILIKE) · auth +
layout · seed de datos.

**Fase 2 (estaba fuera de alcance; construida igual):**
✅ siniestros · ✅ estadísticas · ✅ comparador de pólizas con IA · ✅ portal del cliente.
⛔ WhatsApp/email por API — WhatsApp aparcado por bloqueo legal.

**Extras (fuera de cualquier encargo):**
multi-tenancy (varias corredurías, roles, visibilidad configurable, panel super-admin) ·
gestión de cuenta + recuperación de contraseña · exportar CSV · portal ampliado
(siniestros, renovaciones, subida de documentos) · **emails con Resend** (recordatorios de
renovación a 30/7 días, alerta de fallo del cron, reset de contraseña).

---

## 🚦 Arranque a producción (config, no desarrollo)

Antes de que una correduría real empiece a usarlo:
1. **Desactivar el registro público** en Supabase Auth (`disable_signup: true`).
2. **Borrar los datos DEMO** (`node scripts/limpiar-demo.mjs`) y crear la correduría real
   desde `/admin`.
3. **Rotar** las claves que pasaron por chat (Supabase access token, Anthropic, Resend).
4. (Hecho) `site_url` y Redirect URLs de Auth apuntando a producción.

---

## 🔭 Próximas mejoras candidatas (Fase 3 — sin comprometer)

Priorizar con la clienta según lo que más valore. Ninguna está empezada.

**Producto / uso diario**
- **WhatsApp por deep-link `wa.me`**: botón que abre WhatsApp con un mensaje pre-rellenado
  (renovación, cumpleaños, recordatorio). Sin API ni bloqueo legal — el "interino" del
  propio ROADMAP. Esfuerzo bajo, valor diario alto.
- **Recordatorios configurables**: que el admin elija los días (30/7/…) y edite plantillas.
- **Importar cartera** (CSV/Excel): la inversa del exportar, para migrar desde Excel.
- **Notas/recordatorios internos** y **historial/auditoría** de cambios.
- **Comparador+**: guardar las comparativas y generar un PDF comparativo para el cliente.

**Portal del cliente**
- Mensajería con la correduría · solicitudes (siniestro nuevo, cambio de datos) · firma o
  aceptación de documentos.

**Plataforma / negocio (si se vende a varias corredurías)**
- Facturación/suscripciones · white-label (logo/colores por correduría) · métricas de uso.

**Calidad**
- Tests automatizados (lógica de `semaforo`, buscador, y aislamiento RLS).

---

## ⚙️ Automatizaciones (n8n / Resend)

Criterio: n8n solo para orquestar servicios externos sin integración nativa. Lo interno
(renovaciones, cumpleaños, recordatorios) se queda en Postgres + cron + Resend, nunca en
n8n. Regla: **si los datos no salen del stack Supabase/Vercel, no se mete n8n.**

Al integrar **Resend**, todo lo que era *enviar email* pasó a ser **nativo** — varios
ítems pensados para n8n ya están hechos sin n8n:

- ✅ **HECHO (nativo, Resend)** — Alerta de fallo del cron por email a `ALERT_EMAIL`.
- ✅ **HECHO (nativo, Resend)** — Recordatorio de renovación al cliente (30 y 7 días).
- ⏳ **PENDIENTE — único ítem que sigue siendo n8n de verdad**: **entrada de documentos por
  email (inbound)**. Enviar un correo con la póliza adjunta a una dirección dedicada →
  n8n lee IMAP (o servicio con inbound-parse) → sube el adjunto al bucket del cliente →
  crea interacción "documento recibido". Resend *envía* pero no *recibe*. **Futuro.**
- ⏳ Ingesta de bandeja como interacciones (misma vía inbound). Futuro.
- ⛔ **WhatsApp real de renovación**: bloqueo legal (plantillas aprobadas por Meta +
  consentimiento), no técnico. El recordatorio por email ya cubre la necesidad; el
  `wa.me` cubriría el interino.
- ⏳ Comparador **asíncrono** (generar PDF comparativo y notificar): el síncrono ya está
  hecho; el asíncrono, solo si el volumen lo justifica.
- ⏳ Backup diario: Supabase ya hace backups; un `pg_dump` propio → Drive/S3 sería una
  **GitHub Action** programada, no n8n.

NO usar n8n para: renovaciones, cumpleaños y recordatorios (ya en cron + Resend), motor de
oportunidades cross-sell (lógica interna), cualquier CRUD interno.
