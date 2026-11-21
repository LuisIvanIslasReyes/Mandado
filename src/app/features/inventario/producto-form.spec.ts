import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore, Producto } from '../../core/inventario.store';
import { InventarioFalso, producto } from '../../../testing/inventario-falso';
import { ProductoForm } from './producto-form';

describe('ProductoForm', () => {
  let fixture: ComponentFixture<ProductoForm>;
  let store: InventarioFalso;
  let listo: Mock<() => void>;

  async function crear(existente: Producto | null = null) {
    store = new InventarioFalso();
    await TestBed.configureTestingModule({
      imports: [ProductoForm],
      providers: [{ provide: InventarioStore, useValue: store }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductoForm);
    fixture.componentRef.setInput('producto', existente);
    listo = vi.fn();
    fixture.componentInstance.listo.subscribe(() => listo());
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;

  async function escribir(selector: string, valor: string, evento = 'input') {
    const campo = raiz().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
    await fixture.whenStable();
  }

  async function enviar() {
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const botonCon = (texto: string) =>
    [...raiz().querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;

  it('pide el nombre', async () => {
    await crear();
    const crearSpy = vi.spyOn(store, 'crear');
    await escribir('#producto-nombre', '   ');
    await enviar();
    expect(raiz().querySelector('#producto-nombre-error')?.textContent).toContain(
      'Escribe el nombre',
    );
    expect(crearSpy).not.toHaveBeenCalled();
  });

  it('agrega con los datos limpios y la cantidad inicial', async () => {
    await crear();
    const crearSpy = vi.spyOn(store, 'crear');
    await escribir('#producto-nombre', '  Arroz ');
    await escribir('#producto-unidad', '2: kg', 'change');
    await escribir('#producto-ubicacion', '2: 2', 'change');
    await escribir('#producto-cantidad', '1.5');
    await escribir('#producto-minimo', '1');
    await escribir('#producto-caducidad', '2026-12-31');
    await enviar();

    expect(crearSpy).toHaveBeenCalledWith(
      {
        nombre: 'Arroz',
        marca: null,
        categoria_id: null,
        ubicacion_id: 2,
        unidad: 'kg',
        minimo: 1,
        caduca_el: '2026-12-31',
      },
      1.5,
    );
    expect(listo).toHaveBeenCalled();
  });

  it('al editar no pide cantidad y guarda con actualizar', async () => {
    await crear(producto({ id: 7, nombre: 'Leche', minimo: 0 }));
    expect(raiz().querySelector('#producto-cantidad')).toBeNull();
    expect((raiz().querySelector('#producto-nombre') as HTMLInputElement).value).toBe('Leche');

    const actualizar = vi.spyOn(store, 'actualizar');
    await escribir('#producto-marca', 'Alpura');
    await enviar();
    expect(actualizar).toHaveBeenCalledWith(7, expect.objectContaining({ marca: 'Alpura' }));
  });

  it('muestra el error del servidor y no cierra', async () => {
    await crear();
    vi.spyOn(store, 'crear').mockResolvedValue('No se pudo guardar.');
    await escribir('#producto-nombre', 'Arroz');
    await enviar();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No se pudo guardar');
    expect(listo).not.toHaveBeenCalled();
  });

  it('quitar pide confirmación', async () => {
    await crear(producto({ id: 7 }));
    const quitar = vi.spyOn(store, 'quitar');
    botonCon('Quitar del inventario').click();
    await fixture.whenStable();
    expect(quitar).not.toHaveBeenCalled();
    botonCon('Sí, quitar').click();
    await fixture.whenStable();
    expect(quitar).toHaveBeenCalledWith(7);
    expect(listo).toHaveBeenCalled();
  });
});
