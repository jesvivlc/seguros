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
