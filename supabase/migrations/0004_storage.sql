-- =============================================================================
-- 0004_storage.sql — Bucket privado 'documentos' + políticas por usuario.
-- Convención de ruta: {user_id}/{cliente_id}/{archivo}
-- Los archivos SIEMPRE se sirven por signed URL de corta duración (60s).
-- =============================================================================

-- Bucket privado (public = false).
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Solo se permite operar sobre objetos cuya primera carpeta sea el uid del usuario.
drop policy if exists documentos_select on storage.objects;
create policy documentos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists documentos_insert on storage.objects;
create policy documentos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists documentos_update on storage.objects;
create policy documentos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists documentos_delete on storage.objects;
create policy documentos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
