import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Cliente único de Supabase para toda la app.
 *
 * Cuando subas la migración, genera los tipos con:
 *   pnpm supabase gen types typescript --linked > src/app/core/database.types.ts
 * y cambia `SupabaseClient` por `SupabaseClient<Database>` (y `createClient<Database>`)
 * para que TypeScript conozca tus tablas y columnas.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
