import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import type { Tables } from './database.types';
import { mensajeDeError } from './inventario.store';
import { SupabaseService } from './supabase.service';

export type ItemManual = Pick<
  Tables<'lista_manual'>,
  'id' | 'texto' | 'comprado' | 'usuario_id' | 'created_at'
>;

/**
 * Lo que la familia agrega a mano a la lista ("carbón para la carne asada").
 * Lo que se acaba del inventario vive en InventarioStore.porComprar.
 *
 * Los cambios se ven al instante y se revierten si el servidor falla.
 */
@Injectable({ providedIn: 'root' })
export class ListaStore {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  readonly items = signal<ItemManual[]>([]);
  readonly estado = signal<'inicial' | 'cargando' | 'listo' | 'error'>('inicial');
  readonly pendientes = computed(() => this.items().filter((i) => !i.comprado));
  readonly comprados = computed(() => this.items().filter((i) => i.comprado));

  private canal: RealtimeChannel | null = null;
  private recargaPendiente?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (!this.auth.usuario()) untracked(() => this.reiniciar());
    });
  }

  async iniciar(): Promise<void> {
    const estado = this.estado();
    if (estado === 'listo' || estado === 'cargando') return;
    this.estado.set('cargando');
    const ok = await this.recargar();
    this.estado.set(ok ? 'listo' : 'error');
    if (ok) {
      this.canal = this.supabase
        .channel('lista')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_manual' }, () =>
          this.programarRecarga(),
        )
        .subscribe();
    }
  }

  async agregar(texto: string): Promise<string | null> {
    const limpio = texto.trim();
    if (!limpio) return null;
    const { data, error } = await this.supabase
      .from('lista_manual')
      .insert({ texto: limpio })
      .select('id, texto, comprado, usuario_id, created_at')
      .single();
    if (error) return mensajeDeError(error);
    this.items.update((lista) => (lista.some((i) => i.id === data.id) ? lista : [...lista, data]));
    return null;
  }

  async marcar(id: number, comprado: boolean): Promise<string | null> {
    return this.cambiar(
      (lista) => lista.map((i) => (i.id === id ? { ...i, comprado } : i)),
      () => this.supabase.from('lista_manual').update({ comprado }).eq('id', id),
    );
  }

  async quitar(id: number): Promise<string | null> {
    return this.cambiar(
      (lista) => lista.filter((i) => i.id !== id),
      () => this.supabase.from('lista_manual').delete().eq('id', id),
    );
  }

  /** Borra todo lo que ya está en el carrito. */
  async quitarComprados(): Promise<string | null> {
    const ids = this.comprados().map((i) => i.id);
    if (!ids.length) return null;
    return this.cambiar(
      (lista) => lista.filter((i) => !i.comprado),
      () => this.supabase.from('lista_manual').delete().in('id', ids),
    );
  }

  /** Aplica el cambio en pantalla, lo manda al servidor y lo deshace si falla. */
  private async cambiar(
    local: (lista: ItemManual[]) => ItemManual[],
    remoto: () => PromiseLike<{ error: { code?: string; message?: string } | null }>,
  ): Promise<string | null> {
    const anterior = this.items();
    this.items.update(local);
    const { error } = await remoto();
    if (error) {
      this.items.set(anterior);
      return mensajeDeError(error);
    }
    return null;
  }

  private async recargar(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('lista_manual')
      .select('id, texto, comprado, usuario_id, created_at')
      .order('created_at');
    if (error) return false;
    this.items.set(data);
    return true;
  }

  private programarRecarga(): void {
    clearTimeout(this.recargaPendiente);
    this.recargaPendiente = setTimeout(() => void this.recargar(), 300);
  }

  private reiniciar(): void {
    if (this.canal) void this.supabase.removeChannel(this.canal);
    this.canal = null;
    clearTimeout(this.recargaPendiente);
    this.items.set([]);
    this.estado.set('inicial');
  }
}
