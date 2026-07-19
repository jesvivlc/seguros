-- =============================================================================
-- 0003_funciones.sql — Lógica de renovaciones, cumpleaños y vencimientos.
-- Funciones SECURITY DEFINER: se ejecutan desde el job diario (sin sesión de
-- usuario), por eso derivan el user_id de la propia póliza/cliente y OMITEN RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Genera tareas 'revisar_renovacion' para pólizas vigentes que vencen en ≤60d
-- y aún no tienen una tarea de renovación pendiente asociada.
-- ---------------------------------------------------------------------------
create or replace function public.generar_tareas_renovacion()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insertadas integer := 0;
begin
  with candidatas as (
    insert into public.tareas (
      user_id, cliente_id, poliza_id, tipo, titulo, descripcion,
      fecha_vencimiento, estado, generada_automaticamente
    )
    select
      p.user_id,
      p.cliente_id,
      p.id,
      'revisar_renovacion'::tipo_tarea,
      'Renovación: ' || p.compania || ' ' || p.tipo::text || ' — ' ||
        c.nombre || ' ' || c.apellidos,
      'Póliza ' || p.numero_poliza || ' vence el ' ||
        to_char(p.fecha_vencimiento, 'DD/MM/YYYY') || '.',
      greatest(p.fecha_vencimiento - interval '30 days', current_date)::date,
      'pendiente'::estado_tarea,
      true
    from public.polizas p
    join public.clientes c on c.id = p.cliente_id
    where p.estado = 'vigente'
      and p.fecha_vencimiento >= current_date
      and p.fecha_vencimiento <= current_date + 60
      and not exists (
        select 1 from public.tareas t
        where t.poliza_id = p.id
          and t.tipo = 'revisar_renovacion'
          and t.estado = 'pendiente'
      )
    returning 1
  )
  select count(*) into v_insertadas from candidatas;
  return v_insertadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Genera tareas 'cumpleanos' el día del cumpleaños de cada cliente activo.
-- ---------------------------------------------------------------------------
create or replace function public.generar_tareas_cumpleanos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insertadas integer := 0;
begin
  with candidatas as (
    insert into public.tareas (
      user_id, cliente_id, tipo, titulo, descripcion,
      fecha_vencimiento, estado, generada_automaticamente
    )
    select
      c.user_id,
      c.id,
      'cumpleanos'::tipo_tarea,
      'Cumpleaños: ' || c.nombre || ' ' || c.apellidos,
      'Felicitar a ' || c.nombre || '.',
      current_date,
      'pendiente'::estado_tarea,
      true
    from public.clientes c
    where c.estado = 'activo'
      and c.fecha_nacimiento is not null
      and extract(month from c.fecha_nacimiento) = extract(month from current_date)
      and extract(day   from c.fecha_nacimiento) = extract(day   from current_date)
      and not exists (
        select 1 from public.tareas t
        where t.cliente_id = c.id
          and t.tipo = 'cumpleanos'
          and t.fecha_vencimiento = current_date
      )
    returning 1
  )
  select count(*) into v_insertadas from candidatas;
  return v_insertadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marca como 'vencida' toda póliza vigente cuya fecha de vencimiento ya pasó.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_polizas_vencidas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actualizadas integer := 0;
begin
  with cambiadas as (
    update public.polizas
      set estado = 'vencida'
    where estado = 'vigente'
      and fecha_vencimiento < current_date
    returning 1
  )
  select count(*) into v_actualizadas from cambiadas;
  return v_actualizadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Punto de entrada del job diario. Lo llaman pg_cron y/o el Vercel Cron.
-- ---------------------------------------------------------------------------
create or replace function public.run_daily_jobs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vencidas    integer;
  v_renovacion  integer;
  v_cumple      integer;
begin
  v_vencidas   := public.marcar_polizas_vencidas();
  v_renovacion := public.generar_tareas_renovacion();
  v_cumple     := public.generar_tareas_cumpleanos();
  return jsonb_build_object(
    'polizas_vencidas', v_vencidas,
    'tareas_renovacion', v_renovacion,
    'tareas_cumpleanos', v_cumple,
    'ejecutado_at', now()
  );
end;
$$;

-- Permite invocar run_daily_jobs vía RPC con el service_role (Vercel Cron).
grant execute on function public.run_daily_jobs() to service_role;

-- ---------------------------------------------------------------------------
-- Programación con pg_cron (si el plan de Supabase lo soporta).
-- Si pg_cron NO está disponible, este bloque no hace nada y se debe usar el
-- Vercel Cron Job en /api/cron/renovaciones (ver vercel.json y README).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Elimina el job previo si existía (idempotente).
    perform cron.unschedule('crm_daily_jobs')
      where exists (select 1 from cron.job where jobname = 'crm_daily_jobs');
    perform cron.schedule(
      'crm_daily_jobs',
      '0 6 * * *',                       -- todos los días a las 06:00
      $cron$ select public.run_daily_jobs(); $cron$
    );
    raise notice 'pg_cron configurado: job diario crm_daily_jobs a las 06:00.';
  else
    raise notice 'pg_cron no disponible. Usar el Vercel Cron en /api/cron/renovaciones.';
  end if;
exception when others then
  raise notice 'No se pudo configurar pg_cron (%). Usar Vercel Cron.', sqlerrm;
end $$;
