import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioStore } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';
import { InventarioFalso, producto } from '../../../testing/inventario-falso';
import { Inventario } from './inventario';

describe('Inventario', () => {
  let fixture: ComponentFixture<Inventario>;
  let store: InventarioFalso;
  let avisos: Avisos;

  async function crear(productos = PRODUCTOS) {
    store = new InventarioFalso();
    store.productos.set(productos);
    await TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [{ provide: InventarioStore, useValue: store }],
    }).compileComponents();
    avisos = TestBed.inject(Avisos);
    fixture = TestBed.createComponent(Inventario);
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;
  const nombres = () =>
    [...raiz().querySelectorAll('.producto-nombre')].map((n) => n.firstChild?.textContent?.trim());
  const boton = (etiqueta: string) =>
    raiz().querySelector(`[aria-label="${etiqueta}"]`) as HTMLButtonElement;

  async function cambiar(selector: string, valor: string, evento = 'input') {
    const campo = raiz().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
    await fixture.whenStable();
  }

  const PRODUCTOS = [
    producto({ id: 1, nombre: 'Leche entera', cantidad: 2, minimo: 2 }),
    producto({
      id: 2,
      nombre: 'Jabón para trastes',
      marca: 'Salvo',
      unidad: 'pieza',
      cantidad: 0,
      categoria_id: 2,
      ubicacion_id: 2,
    }),
    producto({ id: 3, nombre: 'Queso panela', marca: null, unidad: 'g', cantidad: 400, minimo: 0 }),
  ];

  it('muestra cada producto con su cantidad, lugar y estado', async () => {
    await crear();
    expect(nombres()).toEqual(['Leche entera', 'Jabón para trastes', 'Queso panela']);
    const filas = [...raiz().querySelectorAll('.producto')];
    expect(filas[0].textContent).toContain('2 litros');
    expect(filas[0].textContent).toContain('Refri · Lácteos');
    expect(filas[0].textContent).toContain('Queda poco');
    expect(filas[1].textContent).toContain('Se acabó');
    expect(filas[2].textContent).not.toContain('Queda poco');
  });

  it('busca sin importar acentos ni mayúsculas, también por marca', async () => {
    await crear();
    await cambiar('#buscar', 'JABON');
    expect(nombres()).toEqual(['Jabón para trastes']);
    await cambiar('#buscar', 'salvo');
    expect(nombres()).toEqual(['Jabón para trastes']);
  });

  it('filtra por ubicación y categoría, y se pueden quitar los filtros', async () => {
    await crear();
    await cambiar('#filtro-ubicacion', '2', 'change');
    expect(nombres()).toEqual(['Jabón para trastes']);
    await cambiar('#filtro-categoria', '1', 'change');
    expect(raiz().textContent).toContain('No hay productos con esos filtros');

    const quitar = [...raiz().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Quitar filtros'),
    )!;
    quitar.click();
    await fixture.whenStable();
    expect(nombres()).toHaveLength(3);
  });

  it('− registra un consumo del paso de la unidad y avisa cuánto queda', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    const exito = vi.spyOn(avisos, 'exito');
    boton('Usé 100 g de Queso panela').click();
    await fixture.whenStable();
    expect(registrar).toHaveBeenCalledWith(3, 'consumo', 100);
    expect(exito).toHaveBeenCalledWith('Queso panela: quedan 300 g');
    expect(raiz().querySelectorAll('.producto')[2].textContent).toContain('300 g');
  });

  it('+ registra una compra', async () => {
    await crear();
    const registrar = vi.spyOn(store, 'registrar');
    boton('Compré 1 pieza de Jabón para trastes').click();
    await fixture.whenStable();
    expect(registrar).toHaveBeenCalledWith(2, 'compra', 1);
  });

  it('no deja restar si ya se acabó', async () => {
    await crear();
    expect(boton('Usé 1 pieza de Jabón para trastes').disabled).toBe(true);
  });

  it('si falla al guardar, muestra el error', async () => {
    await crear();
    vi.spyOn(store, 'registrar').mockResolvedValue('No hay conexión con el servidor.');
    const error = vi.spyOn(avisos, 'error');
    boton('Compré 1 litro de Leche entera').click();
    await fixture.whenStable();
    expect(error).toHaveBeenCalledWith('No hay conexión con el servidor.');
  });

  it('sin productos invita a agregar el primero', async () => {
    await crear([]);
    expect(raiz().textContent).toContain('Todavía no hay productos');
    expect(raiz().textContent).toContain('Agregar el primero');
    expect(raiz().querySelector('#buscar')).toBeNull();
  });

  it('si no carga, ofrece reintentar', async () => {
    await crear();
    store.estado.set('error');
    await fixture.whenStable();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo cargar el inventario',
    );
  });
});
