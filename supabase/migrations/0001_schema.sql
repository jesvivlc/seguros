-- =============================================================================
-- 0001_schema.sql — Esquema base del CRM de correduría de seguros (Fase 1)
-- Tablas, enums, triggers de updated_at, índices y búsqueda full-text (español).
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "unaccent";       -- normalización de acentos (opcional)

-- ---------------------------------------------------------------------------
-- Trigger genérico para mantener updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tipos ENUM
-- ---------------------------------------------------------------------------
do $$ begin
  create type estado_cliente as enum ('activo', 'inactivo', 'potencial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_poliza as enum
    ('auto','hogar','salud','vida','comercio','rc','comunidad','decesos','accidentes','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forma_pago as enum ('anual','semestral','trimestral','mensual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_poliza as enum ('vigente','anulada','vencida','en_renovacion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_interaccion as enum
    ('llamada','whatsapp','email','reunion','presupuesto','renovacion','nota','documento','cambio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_tarea as enum
    ('llamar','enviar_comparativa','recordar_pago','solicitar_documentacion',
     'revisar_renovacion','reunion','cumpleanos','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_tarea as enum ('pendiente','completada','pospuesta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type categoria_documento as enum
    ('poliza','anulacion','personal','siniestro','presupuesto','comision','contratacion','informe','otro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------
create table if not exists public.clientes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  nombre            text not null,
  apellidos         text not null,
  dni_nie           text,
  fecha_nacimiento  date,
  profesion         text,
  estado_civil      text,
  telefono          text,
  telefono_2        text,
  email             text,
  direccion         text,
  codigo_postal     text,
  poblacion         text,
  provincia         text,
  notas             text,
  estado            estado_cliente not null default 'activo',
  origen            text,
  busqueda          tsvector generated always as (
    to_tsvector('spanish',
      coalesce(nombre,'') || ' ' || coalesce(apellidos,'') || ' ' ||
      coalesce(dni_nie,'') || ' ' || coalesce(telefono,'') || ' ' ||
      coalesce(telefono_2,'') || ' ' || coalesce(email,'') || ' ' ||
      coalesce(direccion,'') || ' ' || coalesce(poblacion,''))
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint clientes_dni_nie_unico_por_usuario unique (user_id, dni_nie)
);

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create index if not exists idx_clientes_user        on public.clientes (user_id);
create index if not exists idx_clientes_dni_nie      on public.clientes (dni_nie);
create index if not exists idx_clientes_telefono     on public.clientes (telefono);
create index if not exists idx_clientes_apellidos    on public.clientes (apellidos);
create index if not exists idx_clientes_estado       on public.clientes (estado);
create index if not exists idx_clientes_nacimiento   on public.clientes (fecha_nacimiento);
create index if not exists idx_clientes_busqueda     on public.clientes using gin (busqueda);

-- ---------------------------------------------------------------------------
-- polizas
-- ---------------------------------------------------------------------------
create table if not exists public.polizas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  cliente_id        uuid not null references public.clientes(id) on delete restrict,
  compania          text not null,
  numero_poliza     text not null,
  tipo              tipo_poliza not null,
  matricula         text,
  riesgo_asegurado  text,
  fecha_efecto      date not null,
  fecha_vencimiento date not null,
  prima_anual       numeric(10,2),
  forma_pago        forma_pago not null default 'anual',
  coberturas        jsonb not null default '[]'::jsonb,
  carencias         text,
  observaciones     text,
  estado            estado_poliza not null default 'vigente',
  busqueda          tsvector generated always as (
    to_tsvector('spanish',
      coalesce(numero_poliza,'') || ' ' || coalesce(matricula,'') || ' ' ||
      coalesce(compania,'') || ' ' || coalesce(riesgo_asegurado,''))
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_polizas_updated_at
  before update on public.polizas
  for each row execute function public.set_updated_at();

create index if not exists idx_polizas_user          on public.polizas (user_id);
create index if not exists idx_polizas_cliente        on public.polizas (cliente_id);
create index if not exists idx_polizas_vencimiento    on public.polizas (fecha_vencimiento);
create index if not exists idx_polizas_matricula      on public.polizas (matricula);
create index if not exists idx_polizas_tipo           on public.polizas (tipo);
create index if not exists idx_polizas_estado         on public.polizas (estado);
create index if not exists idx_polizas_compania       on public.polizas (compania);
create index if not exists idx_polizas_busqueda       on public.polizas using gin (busqueda);

-- ---------------------------------------------------------------------------
-- interacciones (timeline del cliente)
-- ---------------------------------------------------------------------------
create table if not exists public.interacciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  poliza_id   uuid references public.polizas(id) on delete set null,
  tipo        tipo_interaccion not null,
  resumen     text not null,
  detalle     text,
  fecha       timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_interacciones_updated_at
  before update on public.interacciones
  for each row execute function public.set_updated_at();

create index if not exists idx_interacciones_user     on public.interacciones (user_id);
create index if not exists idx_interacciones_cliente  on public.interacciones (cliente_id, fecha desc);
create index if not exists idx_interacciones_poliza   on public.interacciones (poliza_id);

-- ---------------------------------------------------------------------------
-- tareas
-- ---------------------------------------------------------------------------
create table if not exists public.tareas (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  cliente_id                uuid references public.clientes(id) on delete cascade,
  poliza_id                 uuid references public.polizas(id) on delete cascade,
  tipo                      tipo_tarea not null default 'otro',
  titulo                    text not null,
  descripcion               text,
  fecha_vencimiento         date not null,
  hora                      time,
  estado                    estado_tarea not null default 'pendiente',
  generada_automaticamente  boolean not null default false,
  completada_at             timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger trg_tareas_updated_at
  before update on public.tareas
  for each row execute function public.set_updated_at();

create index if not exists idx_tareas_user            on public.tareas (user_id);
create index if not exists idx_tareas_cliente          on public.tareas (cliente_id);
create index if not exists idx_tareas_poliza           on public.tareas (poliza_id);
create index if not exists idx_tareas_venc_estado      on public.tareas (fecha_vencimiento, estado);

-- ---------------------------------------------------------------------------
-- documentos
-- ---------------------------------------------------------------------------
create table if not exists public.documentos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  poliza_id     uuid references public.polizas(id) on delete set null,
  categoria     categoria_documento not null default 'otro',
  nombre        text not null,
  storage_path  text not null,
  mime_type     text,
  tamano_bytes  bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_documentos_updated_at
  before update on public.documentos
  for each row execute function public.set_updated_at();

create index if not exists idx_documentos_user     on public.documentos (user_id);
create index if not exists idx_documentos_cliente  on public.documentos (cliente_id);
create index if not exists idx_documentos_poliza   on public.documentos (poliza_id);
