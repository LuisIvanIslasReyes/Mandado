// Desarrollo (`pnpm start`) usa Supabase LOCAL, nunca producción.
// Antes de `pnpm start`, levántalo con `pnpm supabase start` (requiere Docker Desktop abierto).
// Si cambian los valores, consúltalos con `pnpm supabase status`.
// Studio local: http://127.0.0.1:54323 · Correos de auth (Mailpit): http://127.0.0.1:54324
export const environment = {
  production: false,
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
