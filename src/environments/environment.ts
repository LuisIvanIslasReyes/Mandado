// La publishable key está hecha para ir en el frontend: la seguridad
// la dan los GRANT y las reglas RLS de la base de datos.
// NUNCA pongas aquí la secret key (sb_secret_...).
export const environment = {
  production: true,
  supabaseUrl: 'https://ijgawvwqfeuqqibeotfi.supabase.co',
  supabasePublishableKey: 'sb_publishable__G8-Vu8v0SkbGGyK-wrlDw_x_Ga1TV4',
};
