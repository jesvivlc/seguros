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
  - Pendientes: comparador de pólizas con IA · portal del cliente · integración
    WhatsApp/email · estadísticas avanzadas. De una en una cuando lo decidas.

## Aplicar migraciones sin pasos manuales
Existe `scripts/apply-migration.mjs`: aplica un `.sql` vía la Management API de
Supabase. Uso: `SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-migration.mjs <fichero>`.
El token se obtiene en https://supabase.com/dashboard/account/tokens y es revocable.
(No se guarda en el repo; se pasa por variable de entorno.)
