-- ECG — disparador opcional: crear el perfil al registrarse
--
-- Ejecutalo DESPUES de schema.sql y por separado. Si falla por permisos,
-- no pasa nada: la aplicacion crea el perfil desde el cliente, que la
-- politica de RLS ya permite. No ejecutes este archivo junto al otro,
-- porque un fallo aqui deshace tambien las tablas.

-- ============================================================
-- PERFIL AUTOMATICO AL REGISTRARSE
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'handle',
      'usuario_' || substr(new.id::text, 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
