-- Datos SOLO para desarrollo local. Se cargan con `pnpm supabase db reset`.
-- Nunca se suben a producción (`supabase db push` no ejecuta este archivo).

-- Correo de prueba con acceso. Regístrate con él en la app local y confirma
-- la cuenta desde Mailpit: http://127.0.0.1:54324
insert into public.miembros_familia (email) values ('dev@mandado.test');
