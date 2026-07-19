# CRM Correduría de Seguros — Fase 1

Aplicación web para la gestión diaria de una correduría de seguros individual:
clientes, pólizas, renovaciones con semáforo, agenda de tareas, timeline de
interacciones, calendario, buscador universal y gestión documental.

Monopuesto en esta fase, pero con el esquema preparado para multi-tenant
(todas las tablas llevan `user_id` y RLS por usuario).

## Stack

- **Next.js 16** (App Router, TypeScript estricto, Turbopack)
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Tailwind CSS** + componentes propios sobre [Base UI](https://base-ui.com/)
- **date-fns** (locale `es-ES`), **Zod** + **react-hook-form** para formularios
- Despliegue en **Vercel**

Toda la UI está en español. Fechas en `DD/MM/YYYY`, moneda en EUR (`1.234,56 €`).

## Requisitos

- Node.js 20 o superior
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito válido)
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli) para aplicar
  migraciones desde la terminal
- Opcional: cuenta de [Vercel](https://vercel.com) para el despliegue

## 1. Configuración local

```bash
git clone <url-del-repo>
cd seguros-crm
npm install
cp .env.example .env.local   # y rellena los valores (ver más abajo)
```

### Variables de entorno

Se definen en `.env.local` para desarrollo y en el panel de Vercel para
producción. Ver `.env.example` como plantilla.

| Variable | Dónde obtenerla | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | Cliente y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **Secreta.** Crear usuaria, seed y cron. Nunca se expone al cliente |
| `CRON_SECRET` | Genera uno: `openssl rand -hex 32` | Protege `/api/cron/renovaciones` |
| `SEED_USER_EMAIL` | Tú lo eliges | Email de la usuaria inicial (script de creación) |
| `SEED_USER_PASSWORD` | Tú lo eliges | Contraseña de la usuaria inicial |

> `SEED_USER_*` solo las usa el script `scripts/create-user.mjs` en local; no
> hacen falta en Vercel.

## 2. Base de datos (Supabase)

Crea un proyecto en Supabase y aplica las migraciones de `supabase/migrations/`
**en orden**:

| Archivo | Contenido |
| --- | --- |
| `0001_schema.sql` | Tablas, enums, índices y columnas `tsvector` de búsqueda |
| `0002_rls.sql` | Row Level Security (`user_id = auth.uid()`) en todas las tablas |
| `0003_funciones.sql` | Funciones de renovaciones/cumpleaños + job diario y pg_cron |
| `0004_storage.sql` | Bucket privado `documentos` y políticas de acceso por usuario |

### Opción A — Supabase CLI (recomendada)

```bash
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase db push        # aplica todas las migraciones en orden
```

### Opción B — SQL Editor / psql

Copia y ejecuta el contenido de cada archivo, en orden, en el **SQL Editor** del
dashboard de Supabase. O con `psql` usando la connection string (Settings →
Database):

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_funciones.sql
psql "$DATABASE_URL" -f supabase/migrations/0004_storage.sql
```

### Crear la usuaria inicial

El registro público está deshabilitado (una sola usuaria en esta fase). Créala
con el script (usa la `service_role` key y `SEED_USER_*` de `.env.local`):

```bash
node scripts/create-user.mjs
```

Alternativamente, créala a mano en Supabase → Authentication → Add user (marca
"Auto Confirm User").

### Datos de demostración (opcional)

`supabase/seed.sql` inserta 15 clientes, ~30 pólizas, interacciones y tareas,
con fechas de vencimiento relativas a hoy para que el semáforo muestre siempre
rojo/amarillo/verde. Requiere que exista al menos una usuaria (usa la más
antigua). Es idempotente. Ejecútalo desde el SQL Editor o:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

## 3. Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con las
credenciales de la usuaria creada. En móvil, la pantalla principal es **Mi día**.

Otros scripts:

```bash
npm run build   # build de producción (verifica TypeScript)
npm run start   # sirve el build
npm run lint    # ESLint
```

## 4. Despliegue en Vercel

1. Importa el repositorio en Vercel (framework detectado: Next.js).
2. En **Settings → Environment Variables** añade, para Production (y Preview si
   quieres): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`.
3. Despliega. El `vercel.json` del repo ya declara el cron.

## 5. Cron de renovaciones

Cada día a las **06:00** se marcan las pólizas vencidas y se generan las tareas
de renovación (≤60 días vista, tarea 30 días antes del vencimiento) y de
cumpleaños. La lógica vive en Postgres (`run_daily_jobs()`), y hay dos formas de
dispararla:

### Vercel Cron (por defecto)

`vercel.json` ya incluye:

```json
{
  "crons": [{ "path": "/api/cron/renovaciones", "schedule": "0 6 * * *" }]
}
```

La ruta `/api/cron/renovaciones` está protegida por `CRON_SECRET`: exige la
cabecera `Authorization: Bearer <CRON_SECRET>`. Vercel la envía automáticamente
a los cron jobs del proyecto. Invoca la RPC `run_daily_jobs()` con la
`service_role` key.

Para probarlo a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://TU-APP.vercel.app/api/cron/renovaciones
```

### pg_cron (alternativa)

Si tu plan de Supabase soporta `pg_cron`, la migración `0003_funciones.sql`
programa automáticamente el job diario `crm_daily_jobs` a las 06:00 dentro de la
base de datos. En ese caso el Vercel Cron es redundante (puedes dejar solo uno).

## Estructura del proyecto

```
src/
  app/(app)/            Rutas protegidas: Mi día, clientes, pólizas, agenda, buscar
  app/login/            Autenticación
  app/api/buscar/       Buscador (tsvector + ILIKE)
  app/api/cron/         Job diario de renovaciones
  components/           UI y layout (sidebar, topbar, command menu, badges…)
  lib/                  Supabase clients, auth, semáforo, formato, constantes, tipos
supabase/
  migrations/           Esquema, RLS, funciones, storage
  seed.sql              Datos de demostración
scripts/create-user.mjs Crea la usuaria inicial
```

## Notas de seguridad

- **RLS activo en todas las tablas** con política `user_id = auth.uid()`.
- **Registro público deshabilitado**: la usuaria se crea por script o dashboard.
- **Bucket `documentos` privado** (`public = false`). Toda descarga se sirve con
  **signed URLs de corta duración (60 s)**; nunca se exponen URLs públicas.
  Convención de ruta `{user_id}/{cliente_id}/{archivo}`, validada por RLS.
- La `service_role` key solo se usa en el servidor (cron y scripts), nunca en el
  navegador.
