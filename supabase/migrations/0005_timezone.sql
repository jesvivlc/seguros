-- =============================================================================
-- 0005_timezone.sql — Cálculos de fecha en Europe/Madrid, no en UTC del servidor.
--
-- Las funciones del job diario usaban `current_date`, que en Supabase se evalúa
-- en la zona del servidor (UTC). Cerca de la medianoche española eso puede
-- desplazar el "hoy" un día. Se sustituye por la fecha civil de Madrid mediante
-- el helper `public.hoy_madrid()`.
--
-- Idempotente: todas son `create or replace`.
-- =============================================================================

-- Fecha civil de "hoy" en Europe/Madrid (respeta el horario de verano/invierno).
create or replace function public.hoy_madrid()
returns date
language sql
stable
as $$
  select (now() at time zone 'Europe/Madrid')::date;
$$;

-- ---------------------------------------------------------------------------
-- generar_tareas_renovacion — ahora anclada a hoy_madrid().
-- ---------------------------------------------------------------------------
create or replace function public.generar_tareas_renovacion()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insertadas integer := 0;
  v_hoy date := public.hoy_madrid();
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
      greatest(p.fecha_vencimiento - interval '30 days', v_hoy)::date,
      'pendiente'::estado_tarea,
      true
    from public.polizas p
    join public.clientes c on c.id = p.cliente_id
    where p.estado = 'vigente'
      and p.fecha_vencimiento >= v_hoy
      and p.fecha_vencimiento <= v_hoy + 60
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
-- generar_tareas_cumpleanos — el "hoy" del cumpleaños es el de Madrid.
-- ---------------------------------------------------------------------------
create or replace function public.generar_tareas_cumpleanos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_insertadas integer := 0;
  v_hoy date := public.hoy_madrid();
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
      v_hoy,
      'pendiente'::estado_tarea,
      true
    from public.clientes c
    where c.estado = 'activo'
      and c.fecha_nacimiento is not null
      and extract(month from c.fecha_nacimiento) = extract(month from v_hoy)
      and extract(day   from c.fecha_nacimiento) = extract(day   from v_hoy)
      and not exists (
        select 1 from public.tareas t
        where t.cliente_id = c.id
          and t.tipo = 'cumpleanos'
          and t.fecha_vencimiento = v_hoy
      )
    returning 1
  )
  select count(*) into v_insertadas from candidatas;
  return v_insertadas;
end;
$$;

-- ---------------------------------------------------------------------------
-- marcar_polizas_vencidas — vencida cuando la fecha ya pasó según Madrid.
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
      and fecha_vencimiento < public.hoy_madrid()
    returning 1
  )
  select count(*) into v_actualizadas from cambiadas;
  return v_actualizadas;
end;
$$;
