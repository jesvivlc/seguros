# CRM para correduría de seguros — Contexto del proyecto

> Documento maestro para dar contexto a un asistente (p. ej. un Proyecto de claude.ai).
> Descríbelo, cárgalo como "conocimiento del proyecto" y así el asistente puede seguir
> trabajando con contexto completo. Última actualización: 2026-07-21.

---

## 1. Qué es

Aplicación web (CRM) para la gestión diaria de una **correduría de seguros**. Sustituye
el flujo de Excel + WhatsApp + notas de una asesora. Núcleo: gestión de clientes y
pólizas, **detección automática de renovaciones con semáforo** y avisos, agenda de
tareas, timeline de interacciones, siniestros, documentos, buscador, portal del cliente,
comparador de pólizas con IA y estadísticas.

Es **multi-tenant**: se puede vender a varias corredurías, cada una con sus usuarios y su
cartera aislada. Idioma de toda la UI: **español**. Fechas `DD/MM/YYYY`, moneda EUR
(`1.234,56 €`), zona horaria de referencia **Europe/Madrid**.

**En producción:** https://seguros-crm-three.vercel.app · repo: `github.com/jesvivlc/seguros`

---

## 2. Stack técnico

- **Next.js 16** (App Router, TypeScript estricto, Turbopack) · **React 19**
- **Supabase**: Postgres + Auth + Storage + RLS (proyecto ref `lsjuhqrixvalifcuhrfh`)
- **Tailwind CSS v4** + componentes propios sobre **Base UI** (`@base-ui/react`) — estilo shadcn
- **date-fns** (locale `es-ES`) · **Zod** + **react-hook-form** (formularios)
- **@anthropic-ai/sdk** (comparador IA, modelo `claude-opus-4-8`)
- **Resend** (emails: recordatorios, alertas, reset de contraseña) vía `fetch`
- **sonner** (toasts) · **lucide-react** (iconos) · **cmdk** (paleta Cmd+K)
- Despliegue en **Vercel** (auto-deploy desde `main` en GitHub)

### ⚠️ Convención crítica de Next.js
Este Next.js tiene **cambios de ruptura** respecto a versiones anteriores. La convención
`middleware` se renombró a **`proxy`** (`src/proxy.ts`). **Antes de escribir código de
framework, leer la guía en `node_modules/next/dist/docs/`** y hacer caso a los avisos de
deprecación. No asumir APIs de memoria.

---

## 3. Convenciones de código

- **Todo en español**: UI, nombres de dominio (`clientes`, `polizas`, `siniestros`,
  `mi_correduria`), mensajes de error, commits (`Bloque N: …`, `feat(x): …`).
- **Tipos de BD escritos a mano** en `src/lib/database.types.ts` (no generados). Hay que
  mantenerlos sincronizados con las migraciones. Los `Row` deben ser `type` (no
  `interface`) por el index-signature que exige supabase-js.
- **Server Components + Server Actions** por defecto; componentes cliente (`"use client"`)
  solo donde hay interacción/estado. Rutas de API (`route.ts`) para lo que necesita
  request/response (cron, buscar, exportar, comparador).
- **Seguridad por RLS**: la RLS de Supabase es la frontera real; el código de app confía
  en ella. Las server actions verifican autorización además.
- **`server-only`** en libs que usan secretos (`email.ts`, `comparador.ts`).
- Optimistic updates + toasts en las mutaciones. Manejo de errores en español.
- Aritmética de fechas **tz-safe** vía `src/lib/timezone.ts` (`hoyISOZona`/`hoyZona`,
  Europe/Madrid) — nunca `new Date()` para "hoy" en servidor.

---

## 4. Estructura de carpetas

```
src/
  app/
    (app)/            Rutas de la correduría (con sidebar): / (Mi día), clientes,
                      polizas, siniestros, agenda, estadisticas, comparador, buscar, equipo
    admin/            Panel super-admin (crear/gestionar corredurías)
    portal/           Portal del cliente (solo lectura + subir docs)
    auth/             callback (exchange code), recuperar, actualizar (reset contraseña)
    cuenta/           Cambiar contraseña (cualquier sesión)
    login/            Autenticación
    api/              buscar · comparador · exportar · cron/renovaciones
  components/         ui/ (Base UI), layout/ (sidebar, topbar, command-menu), badges, charts
  lib/                supabase/ (server, client, admin, middleware), auth, semaforo, timezone,
                      format, dni, csv, email, comparador, perfil, nav, constants, database.types
  proxy.ts            Middleware de Next 16 (refresca sesión Supabase, protege rutas)
supabase/
  migrations/         0001..0009 (SQL)
  seed.sql            (Fase 1 original — INCOMPATIBLE con multi-tenant, no usar)
scripts/              utilidades Node (ver §9)
docs/superpowers/     specs y plans de diseño (multi-tenancy)
```

---

## 5. Modelo de datos (Postgres / Supabase)

**Tablas** (todas con `id`, `created_at`, `updated_at`, y RLS activa):
- `corredurias` — organización (tenant). `visibilidad` = `compartida` | `por_agente`.
- `perfiles` — 1 por usuario: `correduria_id`, `rol` (`admin`|`agente`), `es_super_admin`.
- `clientes`, `polizas`, `interacciones`, `tareas`, `documentos`, `siniestros` — cartera,
  todas con `correduria_id` (tenant) y `user_id` (agente propietario).
- `portal_accesos` — liga un login de cliente a UN `cliente_id` (portal solo lectura).

**Multi-tenancy (aislamiento por RLS)**:
- Funciones helper `SECURITY DEFINER`: `mi_correduria()`, `mi_rol()`, `es_super_admin()`,
  `visibilidad_mi_correduria()`, `mi_cliente_portal()`, `hoy_madrid()`.
- Tablas de datos: visible/editable si `correduria_id = mi_correduria()` **y**
  (`visibilidad = 'compartida'` **o** `user_id = auth.uid()` **o** `mi_rol() = 'admin'`).
- `correduria_id` tiene `default public.mi_correduria()` → se autocompleta en cada alta.
- **Portal**: políticas permisivas de SOLO LECTURA (`cliente_id = mi_cliente_portal()`) en
  clientes/polizas/documentos/siniestros; el portal no ve tareas ni otros clientes ni
  puede escribir (salvo subir documentos a su carpeta).
- **Storage** (bucket privado `documentos`): ruta `{correduria_id}/{cliente_id}/{archivo}`;
  descargas siempre por **signed URL de 60 s** (nunca URL pública).

**Renovaciones (lógica estrella, en Postgres)**:
- `run_daily_jobs()` llama a `marcar_polizas_vencidas()`, `generar_tareas_renovacion()`
  (pólizas ≤60 días → tarea 30 días antes) y `generar_tareas_cumpleanos()`. Fechas en
  Europe/Madrid (`hoy_madrid()`). Se dispara por Vercel Cron (`/api/cron/renovaciones`,
  protegido con `CRON_SECRET`) o pg_cron.
- **Semáforo** (`src/lib/semaforo.ts`): verde >60 d · amarillo ≤60 · rojo ≤30 · vencida.

---

## 6. Autenticación y roles

- Supabase Auth (email + contraseña). **Registro público debe estar desactivado** (config
  de dashboard; el código no tiene UI de registro).
- Helpers en `src/lib/auth.ts`: `requireUser()`, `requireCorreduria()` (redirige
  super-admin a `/admin` y usuarios-portal a `/portal`), `requireSuperAdmin()`,
  `requirePortal()`.
- **Roles**: `super_admin` (plataforma → `/admin`), `admin` y `agente` (correduría → app),
  cliente-portal (`/portal`). Cada uno aterriza en su área automáticamente.
- `src/proxy.ts` protege todo salvo `/login` y `/auth/*`.

---

## 7. Funcionalidades implementadas

- **Mi día** (`/`) — dashboard: KPIs, tareas de hoy con completar/posponer, panel lateral
  con últimas 5 interacciones antes de llamar, renovaciones próximas.
- **Clientes** (`/clientes`, `/clientes/[id]`) — ficha con pestañas: Datos (validación
  DNI/NIE con letra de control), Pólizas, Timeline, Documentos, Tareas, Siniestros, Portal.
- **Pólizas** (`/polizas`, `/polizas/[id]`) — CRUD, editor de coberturas dinámico, filtros,
  semáforo.
- **Siniestros** (`/siniestros` + pestaña) — ligados a póliza, estados, importes.
- **Agenda** (`/agenda`) — calendario mensual/semanal (tareas, renovaciones, cumpleaños).
- **Buscador global** (Cmd/Ctrl+K + `/buscar`, `/api/buscar`) — clientes y pólizas
  (tsvector `spanish` + ILIKE para matrículas parciales).
- **Documentos** — subida drag&drop por categoría, descarga por signed URL.
- **Comparador de pólizas con IA** (`/comparador`, `/api/comparador`) — sube 2–4 PDFs →
  `claude-opus-4-8` genera tabla comparativa de coberturas + recomendación.
- **Estadísticas** (`/estadisticas`) — cartera, primas, semáforo, siniestros (gráficos
  propios sin dependencias).
- **Portal del cliente** (`/portal`) — solo lectura de sus pólizas/siniestros/renovaciones
  + subir documentos.
- **Multi-correduría** — panel super-admin (`/admin`), gestión de equipo y visibilidad
  (`/equipo`).
- **Cuenta** (`/cuenta`) — cambiar contraseña; recuperación por email (`/auth/recuperar`).
- **Exportar** (`/api/exportar`) — clientes/pólizas/siniestros a CSV (compatible Excel).
- **Emails (Resend)** — recordatorios de renovación al cliente (30/7 días), alerta de
  fallo del cron, reset de contraseña.

---

## 8. Integraciones y variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor: cron, seeds, admin (omite RLS) |
| `CRON_SECRET` | Protege `/api/cron/renovaciones` |
| `ANTHROPIC_API_KEY` | Comparador IA |
| `RESEND_API_KEY` · `EMAIL_FROM` · `ALERT_EMAIL` | Emails |
| `NEXT_PUBLIC_SITE_URL` | URL base para enlaces de email |

Están en Vercel (Production/Development) y en `.env.local` (gitignored). Dominio de envío
verificado en Resend: `didactia.eu`.

---

## 9. Migraciones y scripts

**Migraciones** `supabase/migrations/0001..0009` (schema, RLS, funciones, storage,
timezone, multitenant, siniestros, portal, portal ampliado). Aplicar:
- Vía **SQL Editor** de Supabase (pegar el fichero), o
- `SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-migration.mjs <fichero.sql>` (Management API).

**Scripts** (`scripts/`, leen `.env.local`):
- `apply-migration.mjs` — aplica un `.sql` vía Management API.
- `create-user.mjs` — crea la usuaria inicial (SEED_USER_*).
- `set-super-admin.mjs <email>` — marca un usuario como super-admin.
- `seed-demo.mjs` — 2 corredurías DEMO con admins/agentes/cartera/siniestros.
- `verify-rls.mjs` / `verify-portal.mjs` — pruebas de aislamiento (login + REST).
- `verify-timezone.ts` — pruebas de la lógica Europe/Madrid (Node 24 ejecuta TS).
- `limpiar-demo.mjs` — borra todos los datos DEMO.

---

## 10. Despliegue y verificación

- **Vercel** vinculado al repo → push a `main` = auto-deploy a producción. `vercel.json`
  declara el cron diario (`0 6 * * *`).
- Verificar antes de commitear: **`npm run build`** (TypeScript estricto).
- La BD de dev y prod es la misma (un solo proyecto Supabase). Aplicar migraciones ahí.

---

## 11. Estado actual y pendientes de configuración

Funcionalmente completo (Fase 1 + las features de Fase 2 salvo WhatsApp). Pendiente de
**configuración** para el arranque real (no es desarrollo):
- **Desactivar el registro público** en Supabase Auth (`disable_signup: true`).
- **Borrar los datos DEMO** (`limpiar-demo.mjs`) y crear la correduría real desde `/admin`.
- **Rotar** las claves que pasaron por chat (Supabase access token, Anthropic, Resend).
- `site_url` y Redirect URLs de Auth ya configurados a producción.

Ver `NOTAS-PENDIENTES.md` para el detalle y `ROADMAP.md` para lo que viene.

---

## 12. Cómo trabajar en el proyecto

1. Antes de tocar código de Next, revisar `node_modules/next/dist/docs/` (§2).
2. Cambios en BD → nueva migración `00NN_*.sql` + actualizar `src/lib/database.types.ts`.
3. `npm run build` para validar tipos.
4. Commit descriptivo en español; push a `main` despliega.
5. Cambios de RLS/seguridad → verificar con un script de aislamiento antes de dar por bueno.
