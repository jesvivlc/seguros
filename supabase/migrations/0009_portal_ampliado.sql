-- =============================================================================
-- 0009_portal_ampliado.sql — El portal del cliente puede además:
--   · ver sus siniestros (solo lectura)
--   · subir documentos a su propia carpeta de Storage
-- Sigue sin ver nada de otros clientes ni datos internos.
-- =============================================================================

-- Lectura de sus siniestros
drop policy if exists siniestros_portal_select on public.siniestros;
create policy siniestros_portal_select on public.siniestros for select
  using (cliente_id = public.mi_cliente_portal());

-- Storage: el portal puede SUBIR a la carpeta de SU cliente.
-- Ruta {correduria_id}/{cliente_id}/{archivo} → carpeta [2] es el cliente.
drop policy if exists documentos_portal_insert on storage.objects;
create policy documentos_portal_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[2] = public.mi_cliente_portal()::text
  );
