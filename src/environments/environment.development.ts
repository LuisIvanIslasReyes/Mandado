// Desarrollo (`pnpm start`) usa Supabase LOCAL, nunca producción.
// Antes de `pnpm start`, levántalo con `pnpm supabase start` (requiere Docker Desktop abierto).
// Si cambian los valores, consúltalos con `pnpm supabase status`.
// Studio local: http://127.0.0.1:54323 · Correos de auth (Mailpit): http://127.0.0.1:54324
//
// Supabase se busca en el mismo host desde donde se abrió la app: en la compu es
// 127.0.0.1/localhost, y desde el teléfono (`pnpm start:lan`) es la IP de la compu.
const host = globalThis.location?.hostname || '127.0.0.1';

export const environment = {
  production: false,
  supabaseUrl: `http://${host}:54321`,
  supabasePublishableKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
