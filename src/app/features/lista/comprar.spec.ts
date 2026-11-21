import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';
import { InventarioFalso, producto } from '../../../testing/inventario-falso';
import { Comprar, cantidadSugerida } from './comprar';

describe('cantidadSugerida', () => {
  it('lo que falta para tener el doble del mínimo, en pasos de la unidad', () => {
    expect(cantidadSugerida({ cantidad: 0, minimo: 1, unidad: 'paquete' })).toBe(2);
    expect(cantidadSugerida({ cantidad: 2, minimo: 2, unidad: 'litro' })).toBe(2);
    expect(cantidadSugerida({ cantidad: 0.5, minimo: 1, unidad: 'kg' })).toBe(2);
    expect(cantidadSugerida({ cantidad: 150, minimo: 200, unidad: 'g' })).toBe(300);
  });

  it('nunca sugiere menos de un paso', () => {
    expect(cantidadSugerida({ cantidad: 5, minimo: 2, unidad: 'pieza' })).toBe(1);
  });
});

describe('Comprar', () => {
  let fixture: ComponentFixture<Comprar>;
  let store: InventarioFalso;
  let listo: Mock<() => void>;
  const TORTILLAS = producto({
    id: 4,
    nombre: 'Tortillas',
    unidad: 'paquete',
    cantidad: 0,
    minimo: 1,
  });

  async function crear() {
    store = new InventarioFalso();
    store.productos.set([TORTILLAS]);
    await TestBed.configureTestingModule({
      imports: [Comprar],
      providers: [{ provide: InventarioStore, useValue: store }],
    }).compileComponents();
    fixture = TestBed.createComponent(Comprar);
    fixture.componentRef.setInput('producto', TORTILLAS);
    listo = vi.fn();
    fixture.componentInstance.listo.subscribe(() => listo());
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;

  async function escribir(selector: string, valor: string) {
    const campo = raiz().querySelector(selector) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function enviar() {
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('propone la cantidad sugerida y dice cuánto hay', async () => {
    await crear();
    expect((raiz().querySelector('#comprar-cantidad') as HTMLInputElement).value).toBe('2');
    expect(raiz().textContent).toContain('Hay 0 paquetes');
  });

  it('registra la compra con precio, avisa y cierra', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    const exito = vi.spyOn(TestBed.inject(Avisos), 'exito');
    await escribir('#comprar-cantidad', '3');
    await escribir('#comprar-precio', '66');
    await enviar();
    expect(registrar).toHaveBeenCalledWith(4, 'compra', 3, { precio: 66 });
    expect(exito).toHaveBeenCalledWith('Tortillas: ahora hay 3 paquetes');
    expect(listo).toHaveBeenCalled();
  });

  it('no acepta 0', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    await escribir('#comprar-cantidad', '0');
    await enviar();
    expect(raiz().querySelector('#comprar-cantidad-error')?.textContent).toContain('más de 0');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('si falla, muestra el error y no cierra', async () => {
    await crear();
    vi.spyOn(store, 'registrar').mockResolvedValue('No hay conexión con el servidor.');
    await enviar();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No hay conexión');
    expect(listo).not.toHaveBeenCalled();
  });
});
