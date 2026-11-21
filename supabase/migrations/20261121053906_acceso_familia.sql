-- =====================================================================
-- Mandado: acceso solo para la familia + perfiles automáticos
-- =====================================================================
-- Qué cambia:
--   1. Supabase da por defecto TODOS los privilegios (hasta TRUNCATE) a `anon`
--      y `authenticated` en cada tabla nueva de `public`. Los quitamos y damos
--      solo lo necesario, ahora sí de forma explícita.
--   2. Solo entran los correos que estén en `miembros_familia` y que ya hayan
--      sido confirmados. Cualquier otra cuenta puede existir, pero no ve nada.
--   3. Cada usuario nuevo recibe su fila en `perfiles` automáticamente.
--   4. `movimientos` es un historial: solo se agrega, no se edita ni se borra
--      (para corregir, se registra un 'ajuste'). Y `productos.cantidad` solo
--      la cambia el trigger.
--
-- Para dar acceso a alguien (en Studio > SQL Editor):
--   insert into public.miembros_familia (email) values ('correo@ejemplo.com');
-- Para quitárselo:
--   delete from public.miembros_familia where email = 'correo@ejemplo.com';

-- ===== 1. Permisos: cerrar todo y abrir solo lo necesario =====
-- Objetos que se creen a partir de ahora: sin permisos para anon/authenticated.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- Objetos existentes.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Catálogos: la familia los administra libremente.
grant select, insert, update, delete on public.categorias, public.ubicaciones to authenticated;

-- Productos: todo menos editar `cantidad` directo (eso lo hace el trigger).
grant select, insert, delete on public.productos to authenticated;
grant update (nombre, marca, codigo_barras, categoria_id, ubicacion_id, unidad,
              minimo, caduca_el, imagen_path, activo)
  on public.productos to authenticated;

-- Movimientos: solo leer y agregar. `usuario_id` lo pone la base (auth.uid()).
grant select on public.movimientos to authenticated;
grant insert (producto_id, tipo, cantidad, precio, nota) on public.movimientos to authenticated;

-- Lista manual: `usuario_id` lo pone la base.
grant select, delete on public.lista_manual to authenticated;
grant insert (texto, producto_id, comprado) on public.lista_manual to authenticated;
grant update (texto, producto_id, comprado) on public.lista_manual to authenticated;

-- Perfiles: los crea el trigger; cada quien solo puede cambiar su nombre.
grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;

grant select on public.lista_super, public.por_caducar to authenticated;

-- ===== 2. Quién es de la familia =====
create table public.miembros_familia (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
-- Sin políticas ni permisos: nadie la lee desde la app.
-- Se administra solo desde Studio o SQL.
alter table public.miembros_familia enable row level security;
revoke all on public.miembros_familia from anon, authenticated;

-- security definer: puede leer auth.users y miembros_familia aunque quien
-- consulta no tenga permisos sobre ellas.
create function public.es_familia() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.miembros_familia m on m.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null   -- que el correo sea realmente suyo
  );
$$;
revoke all on function public.es_familia() from public, anon;
grant execute on function public.es_familia() to authenticated;

-- ===== 3. Reglas RLS: ahora exigen ser de la familia =====
-- `(select ...)` hace que Postgres evalúe la función una vez por consulta,
-- no una vez por fila.
drop policy "familia" on public.categorias;
drop policy "familia" on public.ubicaciones;
drop policy "familia" on public.productos;
drop policy "familia" on public.movimientos;
drop policy "familia" on public.lista_manual;
drop policy "leer perfiles"    on public.perfiles;
drop policy "editar mi perfil" on public.perfiles;

create policy "familia" on public.categorias   for all to authenticated
  using ((select public.es_familia())) with check ((select public.es_familia()));
create policy "familia" on public.ubicaciones  for all to authenticated
  using ((select public.es_familia())) with check ((select public.es_familia()));
create policy "familia" on public.productos    for all to authenticated
  using ((select public.es_familia())) with check ((select public.es_familia()));
create policy "familia" on public.movimientos  for all to authenticated
  using ((select public.es_familia())) with check ((select public.es_familia()));
create policy "familia" on public.lista_manual for all to authenticated
  using ((select public.es_familia())) with check ((select public.es_familia()));

create policy "leer perfiles" on public.perfiles
  for select to authenticated
  using ((select public.es_familia()));
create policy "editar mi perfil" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()) and (select public.es_familia()))
  with check (id = (select auth.uid()));

-- ===== 4. El trigger de stock actualiza `cantidad` con permisos propios =====
-- Los usuarios ya no pueden editar `cantidad`, así que el trigger corre como
-- dueño de la tabla. Solo se dispara si el INSERT en movimientos pasó RLS.
alter function public.aplicar_movimiento() security definer;

-- ===== 5. Perfil automático para cada usuario nuevo =====
-- El nombre sale de los metadatos del registro (`options.data.nombre` en
-- supabase.auth.signUp) o, si no hay, de la parte antes de la @ del correo.
create function public.crear_perfil() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
      split_part(new.email, '@', 1),
      'Sin nombre'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.crear_perfil();

-- Usuarios que ya existían antes de esta migración.
insert into public.perfiles (id, nombre)
select id,
       coalesce(nullif(trim(raw_user_meta_data ->> 'nombre'), ''),
                split_part(email, '@', 1),
                'Sin nombre')
from auth.users
on conflict (id) do nothing;
