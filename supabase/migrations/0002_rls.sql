-- =============================================================================
-- 0002_rls.sql — Row Level Security. Cada usuario solo ve/edita sus propias filas.
-- Base del multi-tenant futuro: la política es siempre user_id = auth.uid().
-- =============================================================================

alter table public.clientes      enable row level security;
alter table public.polizas       enable row level security;
alter table public.interacciones enable row level security;
alter table public.tareas        enable row level security;
alter table public.documentos    enable row level security;

-- clientes
drop policy if exists clientes_propias on public.clientes;
create policy clientes_propias on public.clientes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- polizas
drop policy if exists polizas_propias on public.polizas;
create policy polizas_propias on public.polizas
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- interacciones
drop policy if exists interacciones_propias on public.interacciones;
create policy interacciones_propias on public.interacciones
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- tareas
drop policy if exists tareas_propias on public.tareas;
create policy tareas_propias on public.tareas
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- documentos
drop policy if exists documentos_propios on public.documentos;
create policy documentos_propios on public.documentos
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
