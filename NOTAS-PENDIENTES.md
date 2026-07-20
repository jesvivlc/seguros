# Notas de handoff — CRM Correduría de Seguros (Fase 1)

Documento de revisión tras completar los bloques 6–11 del orden de trabajo.
Última actualización: 2026-07-19.

## Estado general

Los 11 bloques de la Fase 1 están implementados y commiteados. Los últimos
seis se cerraron en esta sesión, cada uno verificado con `npm run build`:

| Bloque | Estado |
| --- | --- |
| 1–5 (scaffold, auth, clientes, pólizas, interacciones) | Commiteados en sesiones previas |
| 6 · Tareas + generación automática + cron | ✅ recuperado (trabajo a medias por corte de luz) y verificado |
| 7 · Dashboard "Mi día" | ✅ |
| 8 · Calendario (mensual/semanal) | ✅ |
| 9 · Buscador global (Cmd+K + /buscar) | ✅ |
| 10 · Documentos (Storage + signed URLs) | ✅ |
| 11 · Pulido (proxy, responsive, README) | ✅ |

### Verificación realizada

- **`npm run build`**: pasa limpio, sin errores de TypeScript y **sin avisos**
  (el aviso de deprecación `middleware`→`proxy` se resolvió en el bloque 11).
- **RLS**: `enable row level security` + política `user_id = auth.uid()` (FOR
  ALL) en las 5 tablas (`clientes`, `polizas`, `interacciones`, `tareas`,
  `documentos`) — ver `supabase/migrations/0002_rls.sql`. Storage con políticas
  por carpeta de usuario — ver `0004_storage.sql`.
- **Bucket privado**: `documentos` creado con `public = false`; descargas solo
  por signed URL de 60 s; `getPublicUrl` no se usa en ningún punto del código.

## ⚠️ Acciones de configuración ANTES de que Sara empiece

Estas cosas no pueden vivir en el código y hay que hacerlas en Supabase/Vercel:

1. **Deshabilitar el registro público en Supabase** → Authentication → Sign In /
   Providers → *Allow new users to sign up* = OFF. La app no tiene UI de
   registro, pero mientras el signup esté abierto en Supabase, la API pública lo
   permitiría. **Importante para que solo exista la cuenta de Sara.**
2. **Aplicar las 4 migraciones en orden** (0001→0004) — ver README §2.
3. **Crear la usuaria de Sara** (`node scripts/create-user.mjs` o dashboard).
4. **Variables de entorno en Vercel**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
5. **Cron**: si el plan de Supabase soporta `pg_cron`, la migración 0003 ya lo
   programa a las 06:00. Si además dejas el Vercel Cron (`vercel.json`), el job
   se ejecutaría **dos veces**. No es peligroso (las funciones evitan duplicar
   tareas), pero conviene dejar activo **solo uno** de los dos.
6. (Opcional) Ejecutar `supabase/seed.sql` para datos de demo.

## Puntos que merecen revisión (no bloqueantes)

- ~~**Zona horaria del "hoy"**~~ ✅ **RESUELTO**. Todos los cálculos de "hoy",
  vencimientos y agrupación de tareas usan ahora `Europe/Madrid` vía
  `src/lib/timezone.ts` (`hoyISOZona`/`hoyZona`), no la zona (UTC) del servidor.
  Afecta a dashboard, semáforo, calendario, alta de tareas y a las funciones
  SQL del job diario (`0005_timezone.sql`, helper `hoy_madrid()`). Verificado
  con `scripts/verify-timezone.ts` (casos de 00:30 y 23:30 hora española, verano
  e invierno). **Recordatorio**: aplica también la migración `0005` al desplegar.
- **Borrado de documentos sin confirmación**: al pulsar la papelera se elimina
  el archivo de Storage y su fila sin diálogo de confirmación (coherente con el
  borrado de tareas/interacciones). Si se considera arriesgado, añadir un
  `confirm` o diálogo.
- **Subida de documentos sin validación de tipo/tamaño en el cliente**: se
  aceptan todos los tipos y se confía en el límite de tamaño del bucket de
  Supabase. Si se quiere limitar (p. ej. solo PDF/imágenes, máx. N MB), habría
  que añadir validación en `documentos-tab.tsx` y/o en el bucket.
- **Calendario en móvil**: la vista *mensual* con 7 columnas queda apretada en
  pantallas muy estrechas (los eventos se truncan y aparece "+N más"). La vista
  *semanal* es la cómoda en móvil. Si se usa mucho el móvil, se podría arrancar
  en semana por defecto en pantallas pequeñas.
- **Sin tests automatizados**: no hay suite de pruebas. La verificación es
  `npm run build` (TypeScript) + revisión manual. Para Fase 2 convendría añadir
  al menos tests de la lógica de `semaforo` y del buscador.
- **Cumpleaños en dos sitios**: el job diario genera tareas tipo `cumpleanos`
  (visibles en "Mi día" y en la ficha), y el calendario los pinta aparte desde
  `fecha_nacimiento`. En el calendario se excluyen las tareas `cumpleanos` para
  no duplicar; es intencionado, pero conviene saberlo.

## Fuera de alcance (Fase 1) — NO implementado a propósito

Según el PROMPT.md, estas piezas quedan para fases futuras y **no** se han
construido: comparador de pólizas con IA, portal del cliente, gestión de
siniestros, integración WhatsApp/email y estadísticas avanzadas. El esquema
queda preparado pero sin UI.

> No he iniciado la Fase 2. Cuando quieras arrancarla, dímelo y definimos
> alcance antes de tocar código.

---

## Multi-tenancy (corredurías) — IMPLEMENTADO y desplegado (2026-07-20)

La app pasó de monopuesto a **multi-tenant**: varias corredurías aisladas por RLS,
con super-admin (proveedor) que las provisiona y admins que gestionan sus agentes.
Diseño en `docs/superpowers/specs/…`, plan en `docs/superpowers/plans/…`.

- **Modelo**: tablas `corredurias` y `perfiles`; `correduria_id` en las 5 tablas de
  datos; RLS que aísla por correduría y aplica el modo de visibilidad
  (`compartida` / `por_agente`, lo decide el admin en `/equipo`).
- **Roles**: super-admin (plataforma), admin (correduría), agente.
- **`/admin`**: panel del super-admin para crear/listar corredurías + su primer admin.
- **`/equipo`**: el admin crea agentes (email + contraseña temporal) y cambia la
  visibilidad. Alta directa (sin email de invitación).
- **Storage**: ruta `{correduria_id}/{cliente_id}/{archivo}`.
- Migración `0006_multitenant.sql` aplicada. Verificación: `scripts/verify-rls.mjs`
  (10 checks de aislamiento, todos ✓).

### Credenciales
- **Super-admin**: `jesvivlc+seguro@gmail.com` / `J26ywqOA1moztgkX` → entra en `/admin`.
  Cámbiala. Desde ahí crea la correduría real de Sara.
- **Datos DEMO** (contraseña de todos: `Demo1234!`) — creados con
  `scripts/seed-demo.mjs`, borrables re-ejecutándolo o desactivando desde `/admin`:
  - "DEMO Seguros Levante" (compartida): `demo.levante.admin@example.com` (admin),
    `demo.levante.ana@example.com`, `demo.levante.luis@example.com` (agentes).
  - "DEMO Correduría Norte" (por_agente): `demo.norte.admin@example.com` (admin),
    `demo.norte.marta@example.com`, `demo.norte.pedro@example.com` (agentes).

### Pendiente / notas
- **Borrar datos DEMO** antes de que Sara empiece en serio (están aislados, no
  contaminan su correduría, pero conviene limpiarlos): re-ejecutar `seed-demo.mjs`
  los recrea limpios, o eliminar las corredurías "DEMO …" (cascada).
- El seed **`supabase/seed.sql`** original (Fase 1) quedó **incompatible** con
  multi-tenancy (no pone `correduria_id`); no usarlo. Los datos de prueba ahora
  salen de `seed-demo.mjs`.
- **Fase 2 (Bloque B)** — progreso:
  - ✅ **Siniestros** (2026-07-20): entidad `siniestros` ligada a póliza, pestaña en
    la ficha del cliente, lista global `/siniestros`, migración `0007`, misma RLS
    multi-tenant. Desplegado y verificado.
  - ✅ **Estadísticas** (2026-07-20): panel `/estadisticas` (server-render, datos
    aislados por correduría) con KPIs, semáforo de renovaciones, pólizas por tipo,
    top compañías, prima por tipo y siniestros por estado. Gráficos propios. Desplegado.
  - ✅ **Comparador de pólizas con IA** (2026-07-20): `/comparador` sube 2–4 PDFs y
    `claude-opus-4-8` (SDK `@anthropic-ai/sdk`) los lee y genera tabla comparativa de
    coberturas + diferencias + recomendación. Backend `/api/comparador` (server-only).
    `ANTHROPIC_API_KEY` en Vercel/`.env.local`. Verificado end-to-end. Coste ≈ $0.04/uso
    (a la cuenta de Anthropic del titular de la key). Desplegado.
  - ✅ **Portal del cliente** (2026-07-20): `/portal`, área externa en **SOLO LECTURA**
    donde el cliente ve **solo sus pólizas y documentos**. Migración `0008` (tabla
    `portal_accesos`, `mi_cliente_portal()`, RLS permisiva de solo-lectura). Alta/baja
    del acceso desde la ficha (pestaña Portal). **Aislamiento verificado** con
    `scripts/verify-portal.mjs` (9/9: no ve otros clientes/siniestros/tareas, no puede
    escribir). Desplegado.
  - ⛔ **WhatsApp/email**: NO construidas — aparcadas por decisión propia en `ROADMAP.md`
    (bloqueo legal de WhatsApp + van por n8n a futuro).

## ⚠️ Superficie sensible desplegada — el portal del cliente
El portal expone datos de clientes a **logins externos**. El aislamiento se ha
verificado a nivel de RLS (9/9 checks, contra la BD real), que es la frontera de
seguridad real. Aun así, por ser una superficie externa, **conviene que lo revises**
antes de dar accesos a clientes reales. Logins DEMO ya creados para probarlo (contraseña
`Demo1234!`): `demo.portal.elena@example.com` (ve la cartera de Elena) y
`demo.portal.raul@example.com` (la de Raúl) — entra en producción y comprueba que cada
uno solo ve lo suyo. Bórralos antes de producción real (junto con el resto de DEMO).

## Mejoras adicionales (2026-07-20)
- ✅ **Gestión de cuenta / contraseña**: `/cuenta` para cambiar contraseña (agentes y
  clientes de portal; enlazado desde topbar y portal). Flujo "olvidé mi contraseña":
  `/auth/recuperar` → email → `/auth/callback` → `/auth/actualizar`.
  ⚠️ **Config para que el email funcione**: en Supabase → Authentication → URL
  Configuration, añade la URL de producción a **Redirect URLs**
  (`https://seguros-crm-three.vercel.app/**`) y ten el email de Auth habilitado
  (el servicio integrado de Supabase sirve para pruebas; para producción, configura SMTP).
  El **cambio de contraseña estando dentro funciona ya, sin configuración**.
- ✅ **Exportar cartera (CSV)**: botón "Exportar" en clientes, pólizas y siniestros →
  `/api/exportar?tipo=…` (CSV con `;` y BOM, se abre directo en Excel; respeta la RLS).
- ✅ **Portal ampliado**: el cliente ve sus **siniestros** (solo lectura) y sus
  **próximas renovaciones** destacadas, y puede **subir documentos** a su carpeta
  (migración `0009`; se atribuyen al agente propietario para que la correduría los vea).
  Aislamiento reverificado con `scripts/verify-portal.mjs` (10/10).
- ✅ **Emails con Resend** (`src/lib/email.ts`; dominio `didactia.eu` verificado):
  - **Recordatorios de renovación** al cliente a **30 y 7 días** del vencimiento
    (desde el cron diario). Verificado end-to-end (enviados:1).
  - **Alerta de fallo del cron** por email a `ALERT_EMAIL` si `run_daily_jobs` falla.
  - **Reset de contraseña por Resend**: genera el enlace con la admin API y lo envía
    (no depende del SMTP de Supabase). Verificado que genera el enlace.
  - ✅ **Config aplicada** (vía Management API): `site_url` = URL de producción y
    `uri_allow_list` incluye `https://seguros-crm-three.vercel.app/**` (+ localhost).
    El enlace del reset ya redirige correctamente a la app.
  - Nota: los recordatorios se envían cuando faltan EXACTAMENTE 30 o 7 días; si el cron
    se salta un día, esa póliza se pierde ese recordatorio (MVP sin tabla de control).

## n8n (del ROADMAP) — qué queda realmente
Con Resend, todo lo que era **enviar email** ya es **nativo** (en el stack, como pide la
regla del ROADMAP), sin n8n. Solo seguiría siendo n8n / servicio externo:
- **Entrada de documentos por email** (leer bandeja IMAP → crear interacción/subir doc):
  Resend envía, no recibe. Pendiente (n8n + IMAP, o un servicio con inbound-parse).
- **WhatsApp**: bloqueo legal, aparcado.
- **Backup de BBDD**: Supabase ya hace backups; un `pg_dump` propio sería una GitHub
  Action programada, no n8n.

## Claves API en el chat — ROTAR
Durante el desarrollo se pegaron en el chat: el token de Supabase (`sbp_…`, usado para
aplicar migraciones), la `ANTHROPIC_API_KEY` y la `RESEND_API_KEY`. Todas funcionan y
están guardadas de forma segura (Vercel / `.env.local`, fuera del repo), pero **conviene
rotarlas** en sus paneles respectivos por haber pasado por texto plano.

## Aplicar migraciones sin pasos manuales
Existe `scripts/apply-migration.mjs`: aplica un `.sql` vía la Management API de
Supabase. Uso: `SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-migration.mjs <fichero>`.
El token se obtiene en https://supabase.com/dashboard/account/tokens y es revocable.
(No se guarda en el repo; se pasa por variable de entorno.)
