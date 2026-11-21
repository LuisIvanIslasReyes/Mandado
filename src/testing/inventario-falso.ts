import { computed, signal } from '@angular/core';
import { TipoMovimiento, aplicarMovimiento, diasHasta } from '../app/core/formato';
import type { Catalogo, DatosProducto, Movimiento, Producto } from '../app/core/inventario.store';

/** Producto de prueba con valores por defecto. */
export function producto(cambios: Partial<Producto> = {}): Producto {
  return {
    id: 1,
    nombre: 'Leche entera',
    marca: 'Lala',
    cantidad: 2,
    minimo: 1,
    unidad: 'litro',
    caduca_el: null,
    categoria_id: 1,
    ubicacion_id: 1,
    ...cambios,
  };
}

/**
 * Store en memoria con la misma forma que InventarioStore. Los métodos que
 * guardan responden `null` (éxito); en cada prueba se espían con vi.spyOn.
 */
export class InventarioFalso {
  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Catalogo[]>([
    { id: 1, nombre: 'Lácteos' },
    { id: 2, nombre: 'Limpieza' },
  ]);
  readonly ubicaciones = signal<Catalogo[]>([
    { id: 1, nombre: 'Refri' },
    { id: 2, nombre: 'Alacena' },
  ]);
  readonly estado = signal<'inicial' | 'cargando' | 'listo' | 'error'>('listo');
  readonly nombreCategoria = computed(
    () => new Map(this.categorias().map((c) => [c.id, c.nombre])),
  );
  readonly nombreUbicacion = computed(
    () => new Map(this.ubicaciones().map((c) => [c.id, c.nombre])),
  );
  readonly porComprar = computed(() =>
    this.productos().filter((p) => p.minimo > 0 && p.cantidad <= p.minimo),
  );
  readonly porCaducar = computed(() =>
    this.productos()
      .filter((p) => p.caduca_el && p.cantidad > 0)
      .map((producto) => ({ producto, dias: diasHasta(producto.caduca_el!) }))
      .filter((x) => x.dias <= 7)
      .sort((a, b) => a.dias - b.dias),
  );
  readonly urgentesPorCaducar = computed(() => this.porCaducar().filter((x) => x.dias <= 3).length);
  historial: Movimiento[] = [];

  async iniciar(): Promise<void> {}

  nombrePersona(id: string | null): string {
    return id === 'u1' ? 'Mamá' : 'Alguien';
  }

  async crear(_datos: DatosProducto, _cantidad: number): Promise<string | null> {
    return null;
  }

  async actualizar(_id: number, _datos: DatosProducto): Promise<string | null> {
    return null;
  }

  async quitar(_id: number): Promise<string | null> {
    return null;
  }

  async registrar(
    id: number,
    tipo: TipoMovimiento,
    cantidad: number,
    _extra?: { precio?: number | null; nota?: string | null },
  ): Promise<string | null> {
    this.productos.update((lista) =>
      lista.map((p) =>
        p.id === id ? { ...p, cantidad: aplicarMovimiento(p.cantidad, tipo, cantidad) } : p,
      ),
    );
    return null;
  }

  async movimientos(_id: number): Promise<Movimiento[] | string> {
    return this.historial;
  }
}

/** Fecha 'AAAA-MM-DD' a `dias` de hoy (negativo = en el pasado), en hora local. */
export function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
