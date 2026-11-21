import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { enDias, producto } from '../../testing/inventario-falso';
import { AuthService } from './auth.service';
import { Hoy } from './hoy';
import { InventarioStore, mensajeDeError } from './inventario.store';
import { SupabaseService } from './supabase.service';

describe('InventarioStore.porComprar', () => {
  function crear() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client: {} } },
        { provide: AuthService, useValue: { usuario: signal({ id: 'u1' }) } },
      ],
    });
    const store = TestBed.inject(InventarioStore);
    store.categorias.set([
      { id: 1, nombre: 'Lácteos' },
      { id: 2, nombre: 'Abarrotes' },
    ]);
    return store;
  }

  it('incluye lo que llegó a su mínimo, ordenado por categoría y nombre', () => {
    const store = crear();
    store.productos.set([
      producto({ id: 1, nombre: 'Yogur', categoria_id: 1, cantidad: 1, minimo: 1 }),
      producto({ id: 2, nombre: 'Tortillas', categoria_id: 2, cantidad: 0, minimo: 1 }),
      producto({ id: 3, nombre: 'Crema', categoria_id: 1, cantidad: 0, minimo: 1 }),
      producto({ id: 4, nombre: 'Velas', categoria_id: null, cantidad: 0, minimo: 2 }),
    ]);
    expect(store.porComprar().map((p) => p.nombre)).toEqual([
      'Tortillas',
      'Crema',
      'Yogur',
      'Velas',
    ]);
  });

  it('deja fuera lo que tiene de sobra o no tiene mínimo', () => {
    const store = crear();
    store.productos.set([
      producto({ id: 1, nombre: 'Arroz', cantidad: 3, minimo: 1 }),
      producto({ id: 2, nombre: 'Sal', cantidad: 0, minimo: 0 }),
    ]);
    expect(store.porComprar()).toEqual([]);
  });
});

describe('InventarioStore.porCaducar', () => {
  function crear() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: { client: {} } },
        { provide: AuthService, useValue: { usuario: signal({ id: 'u1' }) } },
      ],
    });
    return TestBed.inject(InventarioStore);
  }

  it('lo de los próximos 7 días o ya caducado, de lo más urgente a lo menos', () => {
    const store = crear();
    store.productos.set([
      producto({ id: 1, nombre: 'Pollo', caduca_el: enDias(6) }),
      producto({ id: 2, nombre: 'Yogur', caduca_el: enDias(-1) }),
      producto({ id: 3, nombre: 'Queso', caduca_el: enDias(1) }),
      producto({ id: 4, nombre: 'Arroz', caduca_el: enDias(30) }),
      producto({ id: 5, nombre: 'Crema', caduca_el: enDias(0), cantidad: 0 }),
      producto({ id: 6, nombre: 'Sal', caduca_el: null }),
    ]);
    expect(store.porCaducar().map((x) => [x.producto.nombre, x.dias])).toEqual([
      ['Yogur', -1],
      ['Queso', 1],
      ['Pollo', 6],
    ]);
    expect(store.urgentesPorCaducar()).toBe(2);
  });

  it('se recalcula cuando cambia el día', () => {
    const store = crear();
    store.productos.set([producto({ nombre: 'Queso', caduca_el: enDias(4) })]);
    expect(store.urgentesPorCaducar()).toBe(0);

    const hoy = TestBed.inject(Hoy);
    const manana = new Date(hoy.fecha());
    manana.setDate(manana.getDate() + 1);
    hoy.fecha.set(manana);
    expect(store.porCaducar()[0].dias).toBe(3);
    expect(store.urgentesPorCaducar()).toBe(1);
  });
});

describe('mensajeDeError (datos)', () => {
  it('sin código es falta de conexión; 42501 es permiso', () => {
    expect(mensajeDeError({ message: 'Failed to fetch' })).toContain('internet');
    expect(mensajeDeError({ code: '42501' })).toBe('No tienes permiso para hacer esto.');
    expect(mensajeDeError({ code: 'XX000' })).toContain('No se pudo guardar');
  });
});
