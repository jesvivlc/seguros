-- =============================================================================
-- 0010_comparativas.sql — Comparativas de pólizas guardadas (Comparador+).
-- Mismo modelo multi-tenant y RLS que siniestros. El cliente es opcional: una
-- comparativa puede hacerse para un prospecto que aún no está en el CRM.
-- NO aplicar a producción sin aprobación de Bruno.
-- =============================================================================

create table if not exists public.comparativas (
  id uuid primary key default gen_random_uuid(),
  correduria_id uuid not null default public.mi_correduria() references public.corredurias(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 200),
  -- Resultado de la IA: { polizas, filas, diferencias_clave, recomendacion }.
  datos jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comparativas_correduria on public.comparativas(correduria_id);
create index if not exists idx_comparativas_cliente on public.comparativas(cliente_id);

drop trigger if exists trg_comparativas_updated_at on public.comparativas;
create trigger trg_comparativas_updated_at before update on public.comparativas
  for each row execute function public.set_updated_at();

alter table public.comparativas enable row level security;
drop policy if exists comparativas_correduria on public.comparativas;
create policy comparativas_correduria on public.comparativas for all
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
    -- El cliente enlazado debe ser visible para quien guarda (RLS de clientes).
    and (
      cliente_id is null
      or exists (select 1 from public.clientes c where c.id = cliente_id)
    )
  );
