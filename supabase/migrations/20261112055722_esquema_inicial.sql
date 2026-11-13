-- =====================================================================
-- Mandado: esquema inicial del inventario de la casa
-- =====================================================================

-- ===== Tipos =====
create type public.tipo_movimiento as enum ('compra', 'consumo', 'merma', 'ajuste');
create type public.unidad_medida  as enum ('pieza', 'kg', 'g', 'litro', 'ml', 'paquete');

-- ===== Tablas =====
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id     bigint generated always as identity primary key,
  nombre text not null unique,
  icono  text
);

create table public.ubicaciones (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.productos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  marca         text,
  codigo_barras text unique,
  categoria_id  bigint references public.categorias(id)  on delete set null,
  ubicacion_id  bigint references public.ubicaciones(id) on delete set null,
  unidad        public.unidad_medida not null default 'pieza',
  cantidad      numeric(10,2) not null default 0 check (cantidad >= 0),
  minimo        numeric(10,2) not null default 0 check (minimo >= 0),
  caduca_el     date,
  imagen_path   text,          -- ruta en Storage, nunca la imagen en sí
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Nunca se edita productos.cantidad directo: se registra un movimiento
-- y el trigger de abajo actualiza el stock.
create table public.movimientos (
  id          bigint generated always as identity primary key,
  producto_id bigint not null references public.productos(id) on delete cascade,
  tipo        public.tipo_movimiento not null,
  cantidad    numeric(10,2) not null check (cantidad >= 0),
  precio      numeric(10,2),
  nota        text,
  usuario_id  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index movimientos_producto_fecha_idx
  on public.movimientos (producto_id, created_at desc);

-- Cosas a comprar que no salen solas del inventario ("carbón para la carne asada")
create table public.lista_manual (
  id          bigint generated always as identity primary key,
  texto       text not null,
  producto_id bigint references public.productos(id) on delete cascade,
  comprado    boolean not null default false,
  usuario_id  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- ===== El stock se actualiza solo con cada movimiento =====
create function public.aplicar_movimiento() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.productos
  set cantidad = case new.tipo
                   when 'compra' then cantidad + new.cantidad
                   when 'ajuste' then new.cantidad   -- "conté y hay X"
                   else greatest(cantidad - new.cantidad, 0)
                 end,
      updated_at = now()
  where id = new.producto_id;
  return new;
end $$;

create trigger on_movimiento
after insert on public.movimientos
for each row execute function public.aplicar_movimiento();

-- ===== Vistas =====
-- security_invoker = true: la vista respeta los permisos y RLS de quien consulta.
create view public.lista_super with (security_invoker = true) as
select p.id, p.nombre, p.marca, c.nombre as categoria,
       p.unidad, p.cantidad, p.minimo
from public.productos p
left join public.categorias c on c.id = p.categoria_id
where p.activo and p.minimo > 0 and p.cantidad <= p.minimo;

create view public.por_caducar with (security_invoker = true) as
select p.id, p.nombre, p.cantidad, p.caduca_el,
       p.caduca_el - current_date as dias_restantes
from public.productos p
where p.activo and p.cantidad > 0
  and p.caduca_el <= current_date + 3;

-- ===== Permisos (capa 1): solo usuarios con sesión; anon no tiene acceso =====
grant select, insert, update, delete
  on public.categorias, public.ubicaciones, public.productos,
     public.movimientos, public.lista_manual
  to authenticated;
grant select, update on public.perfiles to authenticated;
grant select on public.lista_super, public.por_caducar to authenticated;

-- ===== RLS (capa 2): reglas por fila =====
alter table public.perfiles     enable row level security;
alter table public.categorias   enable row level security;
alter table public.ubicaciones  enable row level security;
alter table public.productos    enable row level security;
alter table public.movimientos  enable row level security;
alter table public.lista_manual enable row level security;

create policy "familia" on public.categorias   for all to authenticated using (true) with check (true);
create policy "familia" on public.ubicaciones  for all to authenticated using (true) with check (true);
create policy "familia" on public.productos    for all to authenticated using (true) with check (true);
create policy "familia" on public.movimientos  for all to authenticated using (true) with check (true);
create policy "familia" on public.lista_manual for all to authenticated using (true) with check (true);

create policy "leer perfiles" on public.perfiles
  for select to authenticated using (true);
create policy "editar mi perfil" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ===== Realtime para la lista compartida =====
alter publication supabase_realtime add table public.productos, public.lista_manual;

-- ===== Datos iniciales =====
insert into public.ubicaciones (nombre) values
  ('Refri'), ('Congelador'), ('Alacena'), ('Baño'), ('Lavandería');

insert into public.categorias (nombre) values
  ('Lácteos'), ('Frutas y verduras'), ('Carnes'), ('Abarrotes'),
  ('Bebidas'), ('Congelados'), ('Limpieza'), ('Higiene');
