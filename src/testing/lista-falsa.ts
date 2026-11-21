import { computed, signal } from '@angular/core';
import type { ItemManual } from '../app/core/lista.store';

export function item(cambios: Partial<ItemManual> = {}): ItemManual {
  return {
    id: 1,
    texto: 'Carbón',
    comprado: false,
    usuario_id: 'u1',
    created_at: '2026-11-21T10:00:00Z',
    ...cambios,
  };
}

/** ListaStore en memoria: cambia los items como lo haría el real. */
export class ListaFalsa {
  readonly items = signal<ItemManual[]>([]);
  readonly estado = signal<'inicial' | 'cargando' | 'listo' | 'error'>('listo');
  readonly pendientes = computed(() => this.items().filter((i) => !i.comprado));
  readonly comprados = computed(() => this.items().filter((i) => i.comprado));
  private siguiente = 100;

  async iniciar(): Promise<void> {}

  async agregar(texto: string): Promise<string | null> {
    this.items.update((l) => [...l, item({ id: this.siguiente++, texto: texto.trim() })]);
    return null;
  }

  async marcar(id: number, comprado: boolean): Promise<string | null> {
    this.items.update((l) => l.map((i) => (i.id === id ? { ...i, comprado } : i)));
    return null;
  }

  async quitar(id: number): Promise<string | null> {
    this.items.update((l) => l.filter((i) => i.id !== id));
    return null;
  }

  async quitarComprados(): Promise<string | null> {
    this.items.update((l) => l.filter((i) => !i.comprado));
    return null;
  }
}
