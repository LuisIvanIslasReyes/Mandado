import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore } from '../../core/inventario.store';
import { InventarioFalso, enDias, producto } from '../../../testing/inventario-falso';
import { PorCaducar } from './por-caducar';

describe('PorCaducar', () => {
  let fixture: ComponentFixture<PorCaducar>;
  let store: InventarioFalso;

  async function crear(productos = PRODUCTOS) {
    store = new InventarioFalso();
    store.productos.set(productos);
    await TestBed.configureTestingModule({
      imports: [PorCaducar],
      providers: [{ provide: InventarioStore, useValue: store }],
    }).compileComponents();
    fixture = TestBed.createComponent(PorCaducar);
    await fixture.whenStable();
  }

  const PRODUCTOS = [
    producto({ id: 1, nombre: 'Yogur', unidad: 'ml', cantidad: 900, caduca_el: enDias(-1) }),
    producto({ id: 2, nombre: 'Queso', caduca_el: enDias(1), ubicacion_id: 1 }),
    producto({ id: 3, nombre: 'Pollo', caduca_el: enDias(5) }),
    producto({ id: 4, nombre: 'Arroz', caduca_el: enDias(40) }),
  ];

  const raiz = () => fixture.nativeElement as HTMLElement;
  const nombres = (seccion: string) =>
    [
      ...(raiz()
        .querySelector(`[aria-labelledby="titulo-${seccion}"]`)
        ?.querySelectorAll('.item-nombre') ?? []),
    ].map((n) => n.firstChild?.textContent?.trim());

  it('separa lo caducado, lo de los próximos 3 días y lo de la semana', async () => {
    await crear();
    expect(nombres('vencido')).toEqual(['Yogur']);
    expect(nombres('pronto')).toEqual(['Queso']);
    expect(nombres('semana')).toEqual(['Pollo']);
    expect(raiz().textContent).not.toContain('Arroz');
  });

  it('dice cuándo caduca, cuánto hay y dónde está', async () => {
    await crear();
    const queso = raiz().querySelector('[aria-labelledby="titulo-pronto"] .item')!.textContent!;
    expect(queso).toContain('Caduca mañana');
    expect(queso).toContain('Hay 2 litros · Refri');
    expect(raiz().textContent).toContain('Caducó ayer');
  });

  it('lo caducado abre el detalle listo para "Se echó a perder" con todo lo que hay', async () => {
    await crear();
    (raiz().querySelector('[aria-labelledby="titulo-vencido"] .item') as HTMLButtonElement).click();
    await fixture.whenStable();
    const dialogo = raiz().ownerDocument.querySelector('app-producto-detalle')!;
    const marcado = dialogo.querySelector<HTMLInputElement>('input[type="radio"]:checked')!;
    expect(marcado.closest('label')?.textContent?.trim()).toBe('Se echó a perder');
    expect(dialogo.querySelector<HTMLInputElement>('#movimiento-cantidad')!.value).toBe('900');
  });

  it('lo que no ha caducado abre el detalle normal', async () => {
    await crear();
    (raiz().querySelector('[aria-labelledby="titulo-pronto"] .item') as HTMLButtonElement).click();
    await fixture.whenStable();
    const dialogo = raiz().ownerDocument.querySelector('app-producto-detalle')!;
    const marcado = dialogo.querySelector<HTMLInputElement>('input[type="radio"]:checked')!;
    expect(marcado.closest('label')?.textContent?.trim()).toBe('Usé');
    expect(dialogo.querySelector<HTMLInputElement>('#movimiento-cantidad')!.value).toBe('');
  });

  it('sin nada por caducar lo dice y explica cómo usarlo', async () => {
    await crear([producto({ caduca_el: null })]);
    expect(raiz().textContent).toContain('Nada por caducar esta semana');
  });
});
