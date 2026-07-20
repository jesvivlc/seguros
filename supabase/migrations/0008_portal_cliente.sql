-- =============================================================================
-- 0008_portal_cliente.sql — Portal del cliente (solo lectura de SUS datos).
-- Un usuario-portal se liga a UN cliente vía portal_accesos. No tiene perfil de
-- correduría. Solo puede LEER su propio cliente, sus pólizas y sus documentos.
-- =============================================================================

create table if not exists public.portal_accesos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_portal_cliente on public.portal_accesos(cliente_id);
drop trigger if exists trg_portal_updated_at on public.portal_accesos;
create trigger trg_portal_updated_at before update on public.portal_accesos
  for each row execute function public.set_updated_at();

-- Cliente ligado al usuario-portal actual (SECURITY DEFINER: omite RLS) --------
create or replace function public.mi_cliente_portal() returns uuid
  language sql stable security definer set search_path = public as $$
  select cliente_id from public.portal_accesos
  where user_id = auth.uid() and activo = true;
$$;
grant execute on function public.mi_cliente_portal() to authenticated, anon;

-- RLS de portal_accesos -------------------------------------------------------
alter table public.portal_accesos enable row level security;
drop policy if exists portal_accesos_propio on public.portal_accesos;
drop policy if exists portal_accesos_correduria on public.portal_accesos;
drop policy if exists portal_accesos_super on public.portal_accesos;
-- El propio usuario-portal lee su acceso
create policy portal_accesos_propio on public.portal_accesos for select
  using (user_id = auth.uid());
-- Los usuarios de la correduría del cliente gestionan el acceso
create policy portal_accesos_correduria on public.portal_accesos for all
  using (exists (
    select 1 from public.clientes c
    where c.id = cliente_id and c.correduria_id = public.mi_correduria()
  ))
  with check (exists (
    select 1 from public.clientes c
    where c.id = cliente_id and c.correduria_id = public.mi_correduria()
  ));
create policy portal_accesos_super on public.portal_accesos for all
  using (public.es_super_admin()) with check (public.es_super_admin());

-- Acceso de SOLO LECTURA del portal a los datos de SU cliente ------------------
-- (políticas permisivas adicionales; los usuarios-portal no tienen ninguna
--  política de INSERT/UPDATE/DELETE en estas tablas → lectura pura.)
drop policy if exists clientes_portal_select on public.clientes;
create policy clientes_portal_select on public.clientes for select
  using (id = public.mi_cliente_portal());

drop policy if exists polizas_portal_select on public.polizas;
create policy polizas_portal_select on public.polizas for select
  using (cliente_id = public.mi_cliente_portal());

drop policy if exists documentos_portal_select on public.documentos;
create policy documentos_portal_select on public.documentos for select
  using (cliente_id = public.mi_cliente_portal());

-- Storage: el portal puede firmar URLs de los documentos de SU cliente.
-- Ruta {correduria_id}/{cliente_id}/{archivo} → carpeta [2] es el cliente.
drop policy if exists documentos_portal_select on storage.objects;
create policy documentos_portal_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[2] = public.mi_cliente_portal()::text
  );
