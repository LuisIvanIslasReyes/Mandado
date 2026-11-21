-- Datos SOLO para desarrollo local. Se cargan con `pnpm supabase db reset`.
-- Nunca se suben a producción (`supabase db push` no ejecuta este archivo).

-- Correo de prueba con acceso. Regístrate con él en la app local y confirma
-- la cuenta desde Mailpit: http://127.0.0.1:54324
insert into public.miembros_familia (email) values ('dev@mandado.test');

-- Productos de ejemplo para ver el inventario con datos (fechas relativas a hoy).
insert into public.productos (nombre, marca, categoria_id, ubicacion_id, unidad, cantidad, minimo, caduca_el)
select p.nombre, p.marca, c.id, u.id, p.unidad::public.unidad_medida, p.cantidad, p.minimo, p.caduca_el
from (values
  ('Leche entera',      'Lala',       'Lácteos',           'Refri',      'litro',   2,   2, current_date + 4),
  ('Huevo',             null,         'Abarrotes',         'Refri',      'pieza',  18,   6, current_date + 12),
  ('Queso panela',      'Nochebuena', 'Lácteos',           'Refri',      'g',     400, 200, current_date + 1),
  ('Aguacate',          null,         'Frutas y verduras', 'Alacena',    'pieza',   3,   2, current_date + 2),
  ('Tortillas',         null,         'Abarrotes',         'Refri',      'paquete', 0,   1, null),
  ('Arroz',             'Verde Valle','Abarrotes',         'Alacena',    'kg',    1.5,   1, null),
  ('Pechuga de pollo',  null,         'Carnes',            'Congelador', 'kg',      1, 0.5, current_date + 30),
  ('Yogur natural',     'Danone',     'Lácteos',           'Refri',      'ml',    900,   0, current_date - 1),
  ('Jabón para trastes','Salvo',      'Limpieza',          'Lavandería', 'pieza',   1,   1, null),
  ('Papel de baño',     'Pétalo',     'Higiene',           'Baño',       'paquete', 2,   1, null)
) as p(nombre, marca, categoria, ubicacion, unidad, cantidad, minimo, caduca_el)
join public.categorias c on c.nombre = p.categoria
join public.ubicaciones u on u.nombre = p.ubicacion;
