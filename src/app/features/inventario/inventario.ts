import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  EstadoCaducidad,
  EstadoStock,
  estadoCaducidad,
  estadoStock,
  formatoCantidad,
  normalizar,
  pasoRapido,
} from '../../core/formato';
import { InventarioStore, Producto } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';
import { Dialogo } from '../../shared/dialogo';
import { Icono } from '../../shared/icono';
import { Vacio } from '../../shared/vacio';
import { ProductoDetalle } from './producto-detalle';
import { ProductoForm } from './producto-form';

interface Fila {
  producto: Producto;
  cantidad: string;
  lugar: string;
  stock: EstadoStock;
  caducidad: EstadoCaducidad | null;
  paso: number;
  pasoTexto: string;
}

type Ventana = { tipo: 'crear' } | { tipo: 'editar'; id: number } | { tipo: 'detalle'; id: number };

@Component({
  selector: 'app-inventario',
  imports: [Vacio, Icono, Dialogo, ProductoForm, ProductoDetalle],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inventario {
  protected readonly store = inject(InventarioStore);
  private readonly avisos = inject(Avisos);

  protected readonly busqueda = signal('');
  protected readonly ubicacion = signal<number | null>(null);
  protected readonly categoria = signal<number | null>(null);
  protected readonly ventana = signal<Ventana | null>(null);
  /** Productos con un movimiento en camino (evita dobles toques). */
  private readonly ocupados = signal<ReadonlySet<number>>(new Set());

  protected readonly hayFiltros = computed(
    () => !!this.busqueda().trim() || this.ubicacion() !== null || this.categoria() !== null,
  );

  protected readonly filas = computed<Fila[]>(() => {
    const texto = normalizar(this.busqueda());
    const ubicacion = this.ubicacion();
    const categoria = this.categoria();
    const ubicaciones = this.store.nombreUbicacion();
    const categorias = this.store.nombreCategoria();

    return this.store
      .productos()
      .filter(
        (p) =>
          (ubicacion === null || p.ubicacion_id === ubicacion) &&
          (categoria === null || p.categoria_id === categoria) &&
          (!texto || normalizar(`${p.nombre} ${p.marca ?? ''}`).includes(texto)),
      )
      .map((p) => {
        const paso = pasoRapido(p.unidad);
        return {
          producto: p,
          cantidad: formatoCantidad(p.cantidad, p.unidad),
          lugar: [
            p.ubicacion_id && ubicaciones.get(p.ubicacion_id),
            p.categoria_id && categorias.get(p.categoria_id),
          ]
            .filter(Boolean)
            .join(' · '),
          stock: estadoStock(p),
          caducidad: estadoCaducidad(p.caduca_el),
          paso,
          pasoTexto: formatoCantidad(paso, p.unidad),
        };
      });
  });

  /** El producto abierto, siempre con los datos más recientes. */
  protected readonly productoAbierto = computed(() => {
    const ventana = this.ventana();
    if (!ventana || ventana.tipo === 'crear') return null;
    return this.store.productos().find((p) => p.id === ventana.id) ?? null;
  });

  constructor() {
    void this.store.iniciar();
  }

  protected ocupado(id: number): boolean {
    return this.ocupados().has(id);
  }

  protected alElegir(evento: Event, destino: WritableSignal<number | null>): void {
    const valor = (evento.target as HTMLSelectElement).value;
    destino.set(valor ? Number(valor) : null);
  }

  protected quitarFiltros(): void {
    this.busqueda.set('');
    this.ubicacion.set(null);
    this.categoria.set(null);
  }

  protected async usar(fila: Fila): Promise<void> {
    await this.mover(fila, 'consumo');
  }

  protected async comprar(fila: Fila): Promise<void> {
    await this.mover(fila, 'compra');
  }

  private async mover(fila: Fila, tipo: 'consumo' | 'compra'): Promise<void> {
    const { producto, paso } = fila;
    if (this.ocupado(producto.id)) return;
    this.ocupados.update((s) => new Set(s).add(producto.id));
    const error = await this.store.registrar(producto.id, tipo, paso);
    this.ocupados.update((s) => {
      const copia = new Set(s);
      copia.delete(producto.id);
      return copia;
    });

    if (error) {
      this.avisos.error(error);
      return;
    }
    const actual = this.store.productos().find((p) => p.id === producto.id);
    if (actual) {
      const queda = actual.cantidad === 1 ? 'queda' : 'quedan';
      this.avisos.exito(
        `${actual.nombre}: ${queda} ${formatoCantidad(actual.cantidad, actual.unidad)}`,
      );
    }
  }

  protected abrir(ventana: Ventana): void {
    this.ventana.set(ventana);
  }

  protected cerrar(): void {
    this.ventana.set(null);
  }
}
