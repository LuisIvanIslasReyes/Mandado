import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore } from '../../core/inventario.store';
import { InventarioFalso, producto } from '../../../testing/inventario-falso';
import { ProductoDetalle } from './producto-detalle';

describe('ProductoDetalle', () => {
  let fixture: ComponentFixture<ProductoDetalle>;
  let store: InventarioFalso;
  let listo: Mock<() => void>;
  const LECHE = producto({ id: 5, nombre: 'Leche', cantidad: 3, minimo: 2, unidad: 'litro' });

  async function crear() {
    store = new InventarioFalso();
    store.productos.set([LECHE]);
    store.historial = [
      {
        id: 1,
        tipo: 'compra',
        cantidad: 2,
        precio: 54,
        nota: 'del Costco',
        usuario_id: 'u1',
        created_at: new Date().toISOString(),
      },
    ];
    await TestBed.configureTestingModule({
      imports: [ProductoDetalle],
      providers: [{ provide: InventarioStore, useValue: store }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductoDetalle);
    fixture.componentRef.setInput('producto', LECHE);
    listo = vi.fn();
    fixture.componentInstance.listo.subscribe(() => listo());
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;

  async function elegirTipo(etiqueta: string) {
    const opcion = [...raiz().querySelectorAll<HTMLLabelElement>('.tipo')].find(
      (l) => l.textContent?.trim() === etiqueta,
    )!;
    opcion.querySelector('input')!.click();
    await fixture.whenStable();
  }

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

  it('muestra la cantidad, el estado y el historial con quién y cuánto costó', async () => {
    await crear();
    expect(raiz().querySelector('.cantidad-grande')?.textContent?.trim()).toBe('3 litros');
    const historial = raiz().querySelector('.movimientos')!.textContent!;
    expect(historial).toContain('+ 2 litros · Compré');
    expect(historial).toContain('Mamá');
    expect(historial).toContain('$54.00');
    expect(historial).toContain('del Costco');
  });

  it('registra un consumo con nota', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    await escribir('#movimiento-cantidad', '2');
    await escribir('#movimiento-nota', ' para el pastel ');
    await enviar();
    expect(registrar).toHaveBeenCalledWith(5, 'consumo', 2, {
      precio: null,
      nota: 'para el pastel',
    });
    expect(listo).toHaveBeenCalled();
  });

  it('el precio solo aparece y se manda en compras', async () => {
    await crear();
    expect(raiz().querySelector('#movimiento-precio')).toBeNull();
    await elegirTipo('Compré');
    const registrar = vi.spyOn(store, 'registrar');
    await escribir('#movimiento-cantidad', '6');
    await escribir('#movimiento-precio', '150');
    await enviar();
    expect(registrar).toHaveBeenCalledWith(5, 'compra', 6, { precio: 150, nota: '' });
  });

  it('0 no vale para usar, pero sí para "Conté" (se acabó)', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    await escribir('#movimiento-cantidad', '0');
    await enviar();
    expect(raiz().querySelector('#movimiento-cantidad-error')?.textContent).toContain('más de 0');
    expect(registrar).not.toHaveBeenCalled();

    await elegirTipo('Conté');
    expect(raiz().textContent).toContain('¿Cuánto hay ahora?');
    await enviar();
    expect(registrar).toHaveBeenCalledWith(5, 'ajuste', 0, { precio: null, nota: '' });
  });
});
