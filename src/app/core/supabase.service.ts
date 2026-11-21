import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from './database.types';

/**
 * Cliente único de Supabase para toda la app, tipado con el esquema de la base.
 *
 * Cada vez que agregues una migración, regenera los tipos (con Supabase local corriendo):
 *   pnpm supabase gen types typescript --local > src/app/core/database.types.ts
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database> = createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
