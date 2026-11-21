import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore } from '../../core/inventario.store';
import { ListaStore } from '../../core/lista.store';
import { Avisos } from '../../shared/avisos';
import { InventarioFalso, producto } from '../../../testing/inventario-falso';
import { ListaFalsa, item } from '../../../testing/lista-falsa';
import { Lista } from './lista';

describe('Lista', () => {
  let fixture: ComponentFixture<Lista>;
  let inventario: InventarioFalso;
  let lista: ListaFalsa;

  async function crear() {
    inventario = new InventarioFalso();
    inventario.productos.set([
      producto({ id: 1, nombre: 'Tortillas', unidad: 'paquete', cantidad: 0, minimo: 1 }),
      producto({ id: 2, nombre: 'Leche', cantidad: 2, minimo: 2 }),
      producto({ id: 3, nombre: 'Arroz', unidad: 'kg', cantidad: 5, minimo: 1 }),
    ]);
    lista = new ListaFalsa();
    lista.items.set([
      item({ id: 10, texto: 'Carbón' }),
      item({ id: 11, texto: 'Servilletas', comprado: true }),
    ]);
    await TestBed.configureTestingModule({
      imports: [Lista],
      providers: [
        { provide: InventarioStore, useValue: inventario },
        { provide: ListaStore, useValue: lista },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Lista);
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;
  const seccion = (id: string) => raiz().querySelector(`[aria-labelledby="${id}"]`);
  const nombres = (id: string) =>
    [...(seccion(id)?.querySelectorAll('.item-nombre') ?? [])].map((n) =>
      n.firstChild?.textContent?.trim(),
    );
  const botonCon = (texto: string) =>
    [...raiz().querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;

  it('lo que llegó a su mínimo aparece solo, con cuánto queda', async () => {
    await crear();
    expect(nombres('titulo-acabando')).toEqual(['Tortillas', 'Leche']);
    const texto = seccion('titulo-acabando')!.textContent!;
    expect(texto).toContain('Se acabó');
    expect(texto).toContain('Quedan 2 litros · Lácteos');
    expect(texto).not.toContain('Arroz');
  });

  it('separa lo agregado a mano de lo que ya está en el carrito', async () => {
    await crear();
    expect(nombres('titulo-manual')).toEqual(['Carbón']);
    expect(seccion('titulo-manual')!.textContent).toContain('Lo agregó Mamá');
    expect(nombres('titulo-carrito')).toEqual(['Servilletas']);
  });

  it('lo que agregué yo dice "Lo agregaste tú"', async () => {
    await crear();
    lista.items.update((l) => [...l, item({ id: 12, texto: 'Pilas', usuario_id: 'yo' })]);
    await fixture.whenStable();
    const pilas = [...seccion('titulo-manual')!.querySelectorAll('.item')].at(-1)!;
    expect(pilas.textContent).toContain('Lo agregaste tú');
  });

  it('agrega algo a mano y limpia el campo', async () => {
    await crear();
    const agregar = vi.spyOn(lista, 'agregar');
    const campo = raiz().querySelector('#nuevo') as HTMLInputElement;
    campo.value = '  Hielo ';
    campo.dispatchEvent(new Event('input'));
    raiz().querySelector('form.agregar')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(agregar).toHaveBeenCalledWith('Hielo');
    expect(nombres('titulo-manual')).toEqual(['Carbón', 'Hielo']);
    expect((raiz().querySelector('#nuevo') as HTMLInputElement).value).toBe('');
  });

  it('no agrega texto vacío', async () => {
    await crear();
    const agregar = vi.spyOn(lista, 'agregar');
    raiz().querySelector('form.agregar')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(agregar).not.toHaveBeenCalled();
  });

  it('marcar lo pasa al carrito y desmarcar lo regresa', async () => {
    await crear();
    (raiz().querySelector('#item-10') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(nombres('titulo-carrito')).toEqual(['Carbón', 'Servilletas']);
    expect(seccion('titulo-manual')).toBeNull();

    (raiz().querySelector('#item-11') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(nombres('titulo-manual')).toEqual(['Servilletas']);
  });

  it('"Quitar de la lista" borra lo del carrito y avisa', async () => {
    await crear();
    const exito = vi.spyOn(TestBed.inject(Avisos), 'exito');
    botonCon('Quitar de la lista').click();
    await fixture.whenStable();
    expect(seccion('titulo-carrito')).toBeNull();
    expect(exito).toHaveBeenCalledWith('Se quitó 1 cosa.');
  });

  it('tocar algo que se está acabando abre "Lo compré"', async () => {
    await crear();
    botonCon('Tortillas').click();
    await fixture.whenStable();
    expect(raiz().ownerDocument.querySelector('app-comprar')).not.toBeNull();
  });

  it('sin nada pendiente dice que no falta nada', async () => {
    await crear();
    inventario.productos.set([]);
    lista.items.set([]);
    await fixture.whenStable();
    expect(raiz().textContent).toContain('No falta nada por ahora');
    expect(raiz().querySelector('#nuevo')).not.toBeNull();
  });
});
