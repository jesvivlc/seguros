# Multi-tenancy (corredurías) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el CRM monopuesto en multi-tenant: varias corredurías aisladas por RLS, con super-admin que las provisiona y admins que gestionan sus agentes, con visibilidad de datos configurable por correduría.

**Architecture:** Esquema Postgres compartido con `correduria_id` en cada tabla de datos + RLS que aísla por correduría y aplica el modo de visibilidad (`compartida` / `por_agente`). Un default `correduria_id default public.mi_correduria()` autocompleta el tenant en cada alta, evitando tocar las server actions existentes. Áreas nuevas: `/admin` (super-admin) y `/equipo` (admin de correduría).

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Auth + RLS + Storage), TypeScript. Sin runner de tests: la verificación es `npm run build` + comprobaciones REST/SQL con sesiones distintas (script Node).

**Nota de entorno:** el DDL (crear tablas/políticas) se aplica en el SQL Editor de Supabase (no hay connection string local). Todo lo demás (perfiles, seed, crear usuarios auth) se hace con la `service_role` key vía REST/Admin API, que **omite RLS**.

---

## File Structure

- `supabase/migrations/0006_multitenant.sql` — **crear**: enums, `corredurias`, `perfiles`, `correduria_id` en las 5 tablas, helpers, RLS nueva, storage.
- `scripts/set-super-admin.mjs` — **crear**: marca un email como super-admin (crea/actualiza su perfil) vía service_role.
- `scripts/verify-rls.mjs` — **crear**: prueba de aislamiento con tokens de usuarios distintos.
- `src/lib/database.types.ts` — **modificar**: tipos de `corredurias`, `perfiles`, enums, `correduria_id`, RPCs.
- `src/lib/constants.ts` — **modificar**: labels/opciones de `rol` y `visibilidad`.
- `src/lib/auth.ts` — **modificar**: `getPerfil()`, `requireCorreduria()`, `requireSuperAdmin()`.
- `src/lib/perfil.ts` — **crear**: tipo `Perfil` y carga.
- `src/app/(app)/layout.tsx` — **modificar**: cargar perfil, redirigir super-admin a `/admin`, mostrar nombre de correduría.
- `src/app/admin/layout.tsx`, `page.tsx`, `actions.ts`, `crear-correduria-form.tsx` — **crear**: panel super-admin.
- `src/app/(app)/equipo/page.tsx`, `equipo-client.tsx`, `actions.ts` — **crear**: gestión de agentes + toggle visibilidad.
- `src/lib/nav.ts` — **modificar**: añadir enlace "Equipo" (solo admin).

---

## Task 1: Migración de base de datos (0006_multitenant.sql)

**Files:**
- Create: `supabase/migrations/0006_multitenant.sql`

- [ ] **Step 1: Escribir la migración completa**

```sql
-- =============================================================================
-- 0006_multitenant.sql — Multi-tenancy por correduría.
-- Reemplaza el aislamiento por user_id por aislamiento por correduria_id + rol.
-- =============================================================================

-- Enums ----------------------------------------------------------------------
do $$ begin create type visibilidad_correduria as enum ('compartida','por_agente'); exception when duplicate_object then null; end $$;
do $$ begin create type rol_usuario as enum ('admin','agente'); exception when duplicate_object then null; end $$;

-- corredurias ----------------------------------------------------------------
create table if not exists public.corredurias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cif text,
  visibilidad visibilidad_correduria not null default 'compartida',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_corredurias_updated_at on public.corredurias;
create trigger trg_corredurias_updated_at before update on public.corredurias
  for each row execute function public.set_updated_at();

-- perfiles (1 por usuario) ---------------------------------------------------
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  correduria_id uuid references public.corredurias(id) on delete cascade,
  rol rol_usuario,
  nombre_completo text,
  es_super_admin boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_perfiles_correduria on public.perfiles(correduria_id);
drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at before update on public.perfiles
  for each row execute function public.set_updated_at();

-- Helpers (SECURITY DEFINER: omiten RLS, evitan recursión en las políticas) ---
create or replace function public.mi_correduria() returns uuid
  language sql stable security definer set search_path = public as $$
  select correduria_id from public.perfiles where user_id = auth.uid();
$$;
create or replace function public.mi_rol() returns rol_usuario
  language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where user_id = auth.uid();
$$;
create or replace function public.es_super_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select es_super_admin from public.perfiles where user_id = auth.uid()), false);
$$;
create or replace function public.visibilidad_mi_correduria() returns visibilidad_correduria
  language sql stable security definer set search_path = public as $$
  select c.visibilidad from public.corredurias c
  join public.perfiles p on p.correduria_id = c.id
  where p.user_id = auth.uid();
$$;
grant execute on function public.mi_correduria(), public.mi_rol(),
  public.es_super_admin(), public.visibilidad_mi_correduria() to authenticated, anon;

-- correduria_id en las tablas de datos (tablas vacías: not null directo) ------
alter table public.clientes      add column if not exists correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade;
alter table public.polizas       add column if not exists correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade;
alter table public.interacciones add column if not exists correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade;
alter table public.tareas        add column if not exists correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade;
alter table public.documentos    add column if not exists correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade;
create index if not exists idx_clientes_correduria      on public.clientes(correduria_id);
create index if not exists idx_polizas_correduria       on public.polizas(correduria_id);
create index if not exists idx_interacciones_correduria on public.interacciones(correduria_id);
create index if not exists idx_tareas_correduria        on public.tareas(correduria_id);
create index if not exists idx_documentos_correduria    on public.documentos(correduria_id);

-- RLS de las tablas de datos: fuera lo viejo (por user_id), dentro lo nuevo ---
do $$
declare t text;
begin
  foreach t in array array['clientes','polizas','interacciones','tareas','documentos'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_propias', t);
    execute format('drop policy if exists %I on public.%I;', t||'_propios', t);
    execute format('drop policy if exists %I on public.%I;', t||'_correduria', t);
    execute format($f$
      create policy %I on public.%I for all
      using (
        correduria_id = public.mi_correduria()
        and (
          public.visibilidad_mi_correduria() = 'compartida'
          or user_id = auth.uid()
          or public.mi_rol() = 'admin'
        )
      )
      with check (
        correduria_id = public.mi_correduria()
        and user_id = auth.uid()
      );
    $f$, t||'_correduria', t);
  end loop;
end $$;

-- RLS de corredurias ---------------------------------------------------------
alter table public.corredurias enable row level security;
drop policy if exists corredurias_super on public.corredurias;
drop policy if exists corredurias_propia_select on public.corredurias;
drop policy if exists corredurias_propia_update on public.corredurias;
create policy corredurias_super on public.corredurias for all
  using (public.es_super_admin()) with check (public.es_super_admin());
create policy corredurias_propia_select on public.corredurias for select
  using (id = public.mi_correduria());
create policy corredurias_propia_update on public.corredurias for update
  using (id = public.mi_correduria() and public.mi_rol() = 'admin')
  with check (id = public.mi_correduria() and public.mi_rol() = 'admin');

-- RLS de perfiles ------------------------------------------------------------
alter table public.perfiles enable row level security;
drop policy if exists perfiles_super on public.perfiles;
drop policy if exists perfiles_propio on public.perfiles;
drop policy if exists perfiles_admin on public.perfiles;
create policy perfiles_super on public.perfiles for all
  using (public.es_super_admin()) with check (public.es_super_admin());
create policy perfiles_propio on public.perfiles for select
  using (user_id = auth.uid() or correduria_id = public.mi_correduria());
create policy perfiles_admin on public.perfiles for all
  using (correduria_id = public.mi_correduria() and public.mi_rol() = 'admin')
  with check (correduria_id = public.mi_correduria() and public.mi_rol() = 'admin');

-- Storage: ruta {correduria_id}/{cliente_id}/{archivo} -----------------------
do $$
declare op text;
begin
  foreach op in array array['select','insert','update','delete'] loop
    execute format('drop policy if exists %I on storage.objects;', 'documentos_'||op);
  end loop;
end $$;
create policy documentos_select on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.mi_correduria()::text);
create policy documentos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.mi_correduria()::text);
create policy documentos_update on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.mi_correduria()::text)
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.mi_correduria()::text);
create policy documentos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.mi_correduria()::text);
```

- [ ] **Step 2: Aplicar en Supabase**

Pegar el fichero en el SQL Editor (https://supabase.com/dashboard/project/lsjuhqrixvalifcuhrfh/sql/new) y ejecutar. Alternativa: si hay connection string, aplicar con psql.

- [ ] **Step 3: Verificar que las tablas y helpers existen**

Run (service_role):
```
GET  /rest/v1/corredurias?select=id&limit=1     -> HTTP 200
GET  /rest/v1/perfiles?select=user_id&limit=1   -> HTTP 200
POST /rest/v1/rpc/es_super_admin                 -> 200 (false sin sesión)
```
Expected: 200 en las tres.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/0006_multitenant.sql
git commit -m "feat(db): multi-tenancy — corredurias, perfiles y RLS por correduria"
```

---

## Task 2: Bootstrap super-admin + tipos

**Files:**
- Create: `scripts/set-super-admin.mjs`
- Modify: `src/lib/database.types.ts`
- Modify: `src/lib/constants.ts`
- Create: `src/lib/perfil.ts`

- [ ] **Step 1: Script set-super-admin.mjs**

```js
// Marca un usuario existente como super-admin de la plataforma.
// Uso: node scripts/set-super-admin.mjs <email>
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
function loadEnv(){ try{ const raw=readFileSync(new URL("../.env.local",import.meta.url),"utf8"); for(const l of raw.split("\n")){ const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"") } }catch{} }
loadEnv()
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
const email=process.argv[2]
if(!url||!key){ console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1) }
if(!email){ console.error("Uso: node scripts/set-super-admin.mjs <email>"); process.exit(1) }
const sb=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const { data:list, error:e1 } = await sb.auth.admin.listUsers()
if(e1){ console.error(e1.message); process.exit(1) }
const u=list.users.find(x=>x.email===email)
if(!u){ console.error(`No existe el usuario ${email}`); process.exit(1) }
const { error } = await sb.from("perfiles").upsert({ user_id:u.id, es_super_admin:true, activo:true }, { onConflict:"user_id" })
if(error){ console.error(error.message); process.exit(1) }
console.log(`OK: ${email} es super-admin (id ${u.id})`)
```

- [ ] **Step 2: Ejecutar el bootstrap**

Run: `node scripts/set-super-admin.mjs jesvivlc+seguro@gmail.com`
Expected: `OK: jesvivlc+seguro@gmail.com es super-admin (...)`

- [ ] **Step 3: Tipos en database.types.ts**

Añadir enums y filas:
```ts
// en constants.ts se definen los union types; aquí los tipos de fila:
export type Visibilidad = "compartida" | "por_agente"
export type RolUsuario = "admin" | "agente"

export type CorreduriaRow = Timestamps & {
  nombre: string
  cif: string | null
  visibilidad: Visibilidad
  activa: boolean
}
export type PerfilRow = {
  user_id: string
  correduria_id: string | null
  rol: RolUsuario | null
  nombre_completo: string | null
  es_super_admin: boolean
  activo: boolean
  created_at: string
  updated_at: string
}
```
Añadir `correduria_id: string` a `ClienteRow`, `PolizaRow`, `InteraccionRow`, `TareaRow`, `DocumentoRow`.
Añadir a `Database.Tables`: `corredurias: TableConfig<CorreduriaRow>`, `perfiles: TableConfig<PerfilRow>`.
Añadir a `Database.Functions`: `mi_correduria`, `mi_rol`, `es_super_admin`, `visibilidad_mi_correduria` (Args vacíos, Returns respectivos).

- [ ] **Step 4: constants.ts — labels**
```ts
export const ROL_LABEL: LabelMap<RolUsuario> = { admin: "Administrador", agente: "Agente" }
export const VISIBILIDAD_LABEL: LabelMap<Visibilidad> = {
  compartida: "Compartida (todos ven todo)",
  por_agente: "Por agente (cada uno ve lo suyo)",
}
export const VISIBILIDAD_OPTIONS = toOptions(VISIBILIDAD_LABEL)
```
(importar `Visibilidad`, `RolUsuario` desde database.types o definir los union types aquí y reexportar — seguir el patrón existente donde los union types viven en constants.ts).

- [ ] **Step 5: perfil.ts**
```ts
import { requireUser } from "@/lib/auth"
import type { PerfilRow } from "@/lib/database.types"
export type Perfil = PerfilRow
export async function cargarPerfil(): Promise<Perfil | null> {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from("perfiles").select("*").eq("user_id", user.id).maybeSingle()
  return (data as Perfil) ?? null
}
```

- [ ] **Step 6: Verificar build + super-admin**

Run: `npm run build` -> Compila.
Run REST: `GET /rest/v1/perfiles?select=user_id,es_super_admin` con service_role -> incluye la fila con es_super_admin true.

- [ ] **Step 7: Commit**
```bash
git add scripts/set-super-admin.mjs src/lib/database.types.ts src/lib/constants.ts src/lib/perfil.ts
git commit -m "feat: tipos multi-tenant, perfil y bootstrap super-admin"
```

---

## Task 3: Auth helpers (requireCorreduria / requireSuperAdmin)

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Añadir helpers**

Mantener `requireUser()` como está (`{ supabase, user }`) y añadir:
```ts
import { redirect } from "next/navigation"
import type { Perfil } from "@/lib/perfil"

export async function requireSuperAdmin() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from("perfiles").select("*").eq("user_id", user.id).maybeSingle()
  const perfil = (data as Perfil) ?? null
  if (!perfil?.es_super_admin) redirect("/")
  return { supabase, user, perfil }
}

export async function requireCorreduria() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from("perfiles").select("*").eq("user_id", user.id).maybeSingle()
  const perfil = (data as Perfil) ?? null
  if (!perfil) redirect("/login")
  if (perfil.es_super_admin && !perfil.correduria_id) redirect("/admin")
  if (!perfil.correduria_id) redirect("/login")
  return { supabase, user, perfil }
}
```
(Nota: `Perfil` importado desde `@/lib/perfil` para no duplicar el tipo.)

- [ ] **Step 2: Build**
Run: `npm run build` -> Compila.

- [ ] **Step 3: Commit**
```bash
git add src/lib/auth.ts
git commit -m "feat(auth): requireCorreduria y requireSuperAdmin"
```

---

## Task 4: Panel super-admin (/admin)

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/app/admin/crear-correduria-form.tsx`

- [ ] **Step 1: actions.ts — crear correduría + admin**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function crearCorreduria(input: {
  nombre: string; adminEmail: string; adminPassword: string; adminNombre?: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin() // autoriza: solo super-admin
  const nombre = input.nombre.trim()
  const email = input.adminEmail.trim()
  if (!nombre) return { ok: false, error: "Nombre de correduría obligatorio." }
  if (!email || !input.adminPassword) return { ok: false, error: "Email y contraseña del admin obligatorios." }

  const admin = createAdminClient()
  const { data: corr, error: e1 } = await admin.from("corredurias").insert({ nombre }).select("id").single()
  if (e1 || !corr) return { ok: false, error: "No se pudo crear la correduría." }

  const { data: created, error: e2 } = await admin.auth.admin.createUser({
    email, password: input.adminPassword, email_confirm: true,
  })
  if (e2 || !created.user) {
    await admin.from("corredurias").delete().eq("id", corr.id) // rollback
    return { ok: false, error: e2?.message ?? "No se pudo crear el usuario admin." }
  }
  const { error: e3 } = await admin.from("perfiles").upsert({
    user_id: created.user.id, correduria_id: corr.id, rol: "admin",
    nombre_completo: input.adminNombre ?? null, activo: true,
  }, { onConflict: "user_id" })
  if (e3) return { ok: false, error: "Correduría creada pero falló el perfil del admin." }

  revalidatePath("/admin")
  return { ok: true }
}
```

- [ ] **Step 2: layout.tsx (guarda super-admin)**
```tsx
import Link from "next/link"
import { requireSuperAdmin } from "@/lib/auth"
import { logout } from "@/app/login/actions"
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin()
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-lg font-semibold">Panel de plataforma</h1>
        <form action={logout}><button className="text-muted-foreground text-sm hover:underline">Salir</button></form>
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: page.tsx (lista + form)**
```tsx
import { requireSuperAdmin } from "@/lib/auth"
import type { CorreduriaRow } from "@/lib/database.types"
import { CrearCorreduriaForm } from "./crear-correduria-form"
export const dynamic = "force-dynamic"
export default async function AdminPage() {
  const { supabase } = await requireSuperAdmin()
  const { data } = await supabase.from("corredurias").select("*").order("created_at", { ascending: false })
  const corredurias = (data ?? []) as CorreduriaRow[]
  return (
    <div className="grid gap-6">
      <CrearCorreduriaForm />
      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Corredurías ({corredurias.length})</h2>
        {corredurias.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
            <span className="font-medium">{c.nombre}</span>
            <span className="text-muted-foreground text-xs">{c.activa ? "activa" : "inactiva"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: crear-correduria-form.tsx (client)**

Formulario con inputs (nombre, adminNombre, adminEmail, adminPassword), botón que llama `crearCorreduria`, toast de resultado y `router.refresh()`. Usar `Input`, `Button`, `sonner` (patrón de los formularios existentes).

- [ ] **Step 5: Build + commit**
```bash
npm run build
git add src/app/admin
git commit -m "feat(admin): panel super-admin para crear y listar corredurias"
```

---

## Task 5: Gestión de equipo (/equipo) — agentes + visibilidad

**Files:**
- Create: `src/app/(app)/equipo/page.tsx`, `equipo-client.tsx`, `actions.ts`
- Modify: `src/lib/nav.ts`

- [ ] **Step 1: actions.ts**

```ts
"use server"
import { revalidatePath } from "next/cache"
import { requireCorreduria } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Visibilidad } from "@/lib/database.types"

async function requireAdminCorreduria() {
  const ctx = await requireCorreduria()
  if (ctx.perfil.rol !== "admin") throw new Error("no-admin")
  return ctx
}

export async function crearAgente(input: { email: string; password: string; nombre?: string; rol: "admin" | "agente" }) {
  const { perfil } = await requireAdminCorreduria()
  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email.trim(), password: input.password, email_confirm: true,
  })
  if (error || !created.user) return { ok: false, error: error?.message ?? "No se pudo crear el usuario." }
  const { error: e2 } = await admin.from("perfiles").upsert({
    user_id: created.user.id, correduria_id: perfil.correduria_id, rol: input.rol,
    nombre_completo: input.nombre ?? null, activo: true,
  }, { onConflict: "user_id" })
  if (e2) return { ok: false, error: "Usuario creado pero falló el perfil." }
  revalidatePath("/equipo")
  return { ok: true }
}

export async function cambiarVisibilidad(v: Visibilidad) {
  const { supabase, perfil } = await requireAdminCorreduria()
  const { error } = await supabase.from("corredurias").update({ visibilidad: v }).eq("id", perfil.correduria_id!)
  if (error) return { ok: false, error: "No se pudo cambiar la visibilidad." }
  revalidatePath("/equipo")
  return { ok: true }
}

export async function desactivarUsuario(userId: string, activo: boolean) {
  const { supabase, perfil } = await requireAdminCorreduria()
  const { error } = await supabase.from("perfiles").update({ activo })
    .eq("user_id", userId).eq("correduria_id", perfil.correduria_id!)
  if (error) return { ok: false, error: "No se pudo actualizar." }
  revalidatePath("/equipo")
  return { ok: true }
}
```

- [ ] **Step 2: page.tsx (server)**

Guarda `requireCorreduria` + rol admin (si no admin, `redirect("/")`). Carga la correduría (`visibilidad`) y los perfiles de la correduría (con email — obtener email vía `createAdminClient().auth.admin.listUsers()` y cruzar por id, ya que `auth.users` no es accesible por RLS). Pasar a `equipo-client`.

- [ ] **Step 3: equipo-client.tsx (client)**

- Selector de **visibilidad** (`SelectSimple` con `VISIBILIDAD_OPTIONS`) que llama `cambiarVisibilidad`.
- Formulario para **crear agente** (email, nombre, password, rol) → `crearAgente`, toast, refresh.
- Lista de usuarios de la correduría con su rol y botón activar/desactivar → `desactivarUsuario`.
- Patrón de estado/optimismo como en `tareas-tab.tsx`.

- [ ] **Step 4: nav.ts — enlace Equipo (solo admin)**

El `SidebarNav` recibe el rol; añadir un item "Equipo" (`/equipo`, icono `Users2`/`Settings`) visible solo si `rol === "admin"`. Pasar el rol desde el layout.

- [ ] **Step 5: Build + commit**
```bash
npm run build
git add "src/app/(app)/equipo" src/lib/nav.ts
git commit -m "feat(equipo): gestion de agentes y visibilidad por correduria"
```

---

## Task 6: Integración en el layout (app)

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Cargar perfil y enrutar**

Sustituir la carga simple de `user` por `requireCorreduria()` (redirige super-admin sin correduría a `/admin`). Cargar el nombre de la correduría y pasarlo al sidebar; pasar `perfil.rol` al `SidebarNav` para el enlace "Equipo". Mostrar el nombre de la correduría en la cabecera del sidebar (sustituir el texto fijo "CRM Seguros" o añadirlo debajo).

```tsx
const { user, perfil } = await requireCorreduria()
const { data: corr } = await (await createClient()).from("corredurias").select("nombre").eq("id", perfil.correduria_id!).maybeSingle()
// pasar corr?.nombre y perfil.rol a los componentes de layout
```

- [ ] **Step 2: Build + commit**
```bash
npm run build
git add "src/app/(app)/layout.tsx" src/components/layout
git commit -m "feat(app): enruta super-admin a /admin y muestra correduria en el sidebar"
```

---

## Task 7: Verificación de aislamiento (RLS)

**Files:**
- Create: `scripts/verify-rls.mjs`
- Modify: `tsconfig.json` (ya excluye `scripts`)

- [ ] **Step 1: Sembrar 2 corredurías de prueba con service_role**

Crear vía script/REST (service_role omite RLS): correduría A y B, cada una con 1 admin y 1 agente (auth users + perfiles), y unos clientes en cada una (con `correduria_id` y `user_id` del agente). Guardar credenciales para el test.

- [ ] **Step 2: verify-rls.mjs**

Con el **anon key**, hacer login (`/auth/v1/token?grant_type=password`) como:
- agente de A → `GET /rest/v1/clientes` devuelve SOLO clientes de A.
- agente de B → SOLO los de B (aislamiento entre corredurías).
- en correduría con `visibilidad='por_agente'`: un agente NO ve clientes de otro agente; el admin SÍ.
- en `visibilidad='compartida'`: un agente ve todos los de su correduría.
Aserciones con conteos esperados; salida OK/FALLO y `process.exit(1)` si falla.

- [ ] **Step 2b: Ejecutar**

Run: `node scripts/verify-rls.mjs`
Expected: todas las aserciones ✓.

- [ ] **Step 3: Commit**
```bash
git add scripts/verify-rls.mjs
git commit -m "test: verificacion de aislamiento RLS multi-tenant"
```

---

## Task 8: Deploy

- [ ] **Step 1:** `git push origin main` (auto-deploy en Vercel).
- [ ] **Step 2:** Verificar en producción: login como super-admin → `/admin`; login como admin de correduría → `/` + acceso a `/equipo`.
- [ ] **Step 3:** Recordatorio: la migración 0006 debe estar aplicada en la BD de producción (misma BD que dev en este proyecto).

---

## Self-Review

- **Cobertura del spec:** corredurias/perfiles (T1,T2) ✓ · roles y super-admin (T2,T3,T4) ✓ · RLS + visibilidad configurable (T1) ✓ · privacidad super-admin sin datos de clientes (T1: no aparece en políticas de datos) ✓ · panel /admin (T4) ✓ · gestión equipo + toggle (T5) ✓ · creación directa de usuarios (T4,T5 vía service_role) ✓ · storage por correduría (T1) ✓ · bootstrap (T2) ✓ · pruebas de aislamiento (T7) ✓. Bloque C (seed ficticio) queda como plan aparte.
- **Placeholders:** el DDL, helpers, actions y scripts van con código real. Las UIs client (T4.4, T5.3) se describen por patrón (siguen formularios existentes) — se detallan al implementar.
- **Consistencia de tipos:** `mi_correduria()`, `requireCorreduria()`, `Perfil`, `Visibilidad`, `RolUsuario`, `crearCorreduria`, `crearAgente`, `cambiarVisibilidad` usados con nombres consistentes en todas las tareas.
