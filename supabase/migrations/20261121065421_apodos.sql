-- =====================================================================
-- Mandado: apodos ("Mamá", "Chata", "Hermana")
-- =====================================================================
-- Quien administra le pone un apodo a cada correo al darle acceso:
--   insert into public.miembros_familia (email, apodo) values ('correo@ejemplo.com', 'Mamá');
-- y para cambiarlo después:
--   update public.miembros_familia set apodo = 'Chata' where email = 'correo@ejemplo.com';
--
-- El apodo se vuelve el nombre de su perfil: al entrar por primera vez o,
-- si ya tenía cuenta, en cuanto se pone o se cambia. Cada quien puede
-- cambiar su propio nombre desde la app.

alter table public.miembros_familia
  add column apodo text check (apodo is null or char_length(trim(apodo)) between 1 and 30);

-- Nombres razonables desde la app (las filas viejas no se revisan).
alter table public.perfiles
  add constraint perfiles_nombre_largo
  check (char_length(trim(nombre)) between 1 and 30) not valid;

-- Perfil nuevo: primero el apodo, luego el nombre del registro, luego el correo.
create or replace function public.crear_perfil() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(
      (select nullif(trim(m.apodo), '') from public.miembros_familia m
        where m.email = lower(new.email)),
      nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
      split_part(new.email, '@', 1),
      'Sin nombre'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Poner o cambiar un apodo lo aplica a la cuenta si ya existe.
create function public.aplicar_apodo() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(new.apodo), '') is not null then
    update public.perfiles p
    set nombre = trim(new.apodo)
    from auth.users u
    where u.id = p.id
      and lower(u.email) = new.email;
  end if;
  return new;
end $$;
revoke all on function public.aplicar_apodo() from public, anon, authenticated;

create trigger on_apodo
after insert or update of apodo on public.miembros_familia
for each row execute function public.aplicar_apodo();
