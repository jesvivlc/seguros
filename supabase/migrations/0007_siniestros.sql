-- =============================================================================
-- 0007_siniestros.sql — Gestión de siniestros (partes) ligados a póliza.
-- Mismo modelo multi-tenant y RLS que el resto de tablas de datos.
-- =============================================================================

do $$ begin create type tipo_siniestro as enum
  ('danos','robo','incendio','agua','rc','lesiones','otro');
  exception when duplicate_object then null; end $$;
do $$ begin create type estado_siniestro as enum
  ('abierto','en_tramite','pericial','resuelto','rechazado','cerrado');
  exception when duplicate_object then null; end $$;

create table if not exists public.siniestros (
  id uuid primary key default gen_random_uuid(),
  correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poliza_id uuid not null references public.polizas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  numero_siniestro text,
  tipo tipo_siniestro not null default 'otro',
  estado estado_siniestro not null default 'abierto',
  fecha_ocurrencia date,
  fecha_apertura date not null default public.hoy_madrid(),
  descripcion text,
  importe_estimado numeric(10,2),
  importe_indemnizado numeric(10,2),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_siniestros_correduria on public.siniestros(correduria_id);
create index if not exists idx_siniestros_cliente on public.siniestros(cliente_id);
create index if not exists idx_siniestros_poliza on public.siniestros(poliza_id);
create index if not exists idx_siniestros_estado on public.siniestros(estado);

drop trigger if exists trg_siniestros_updated_at on public.siniestros;
create trigger trg_siniestros_updated_at before update on public.siniestros
  for each row execute function public.set_updated_at();

alter table public.siniestros enable row level security;
drop policy if exists siniestros_correduria on public.siniestros;
create policy siniestros_correduria on public.siniestros for all
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
