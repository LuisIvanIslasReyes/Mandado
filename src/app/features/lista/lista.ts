import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { formatoCantidad } from '../../core/formato';
import { InventarioStore, Producto } from '../../core/inventario.store';
import { ItemManual, ListaStore } from '../../core/lista.store';
import { Avisos } from '../../shared/avisos';
import { Dialogo } from '../../shared/dialogo';
import { Icono } from '../../shared/icono';
import { Vacio } from '../../shared/vacio';
import { Comprar } from './comprar';

@Component({
  selector: 'app-lista',
  imports: [Vacio, Icono, Dialogo, Comprar],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lista {
  protected readonly inventario = inject(InventarioStore);
  protected readonly lista = inject(ListaStore);
  private readonly avisos = inject(Avisos);

  protected readonly nuevo = signal('');
  protected readonly agregando = signal(false);
  /** Producto al que se le está registrando la compra. */
  private readonly comprandoId = signal<number | null>(null);

  protected readonly comprando = computed(() => {
    const id = this.comprandoId();
    return id === null ? null : (this.inventario.productos().find((p) => p.id === id) ?? null);
  });

  protected readonly estado = computed(() => {
    const a = this.inventario.estado();
    const b = this.lista.estado();
    if (a === 'error' || b === 'error') return 'error';
    return a === 'listo' && b === 'listo' ? 'listo' : 'cargando';
  });

  protected readonly vacia = computed(
    () =>
      !this.inventario.porComprar().length &&
      !this.lista.pendientes().length &&
      !this.lista.comprados().length,
  );

  constructor() {
    void this.inventario.iniciar();
    void this.lista.iniciar();
  }

  protected reintentar(): void {
    void this.inventario.iniciar();
    void this.lista.iniciar();
  }

  protected detalle(p: Producto): string {
    const queda =
      p.cantidad <= 0
        ? 'Se acabó'
        : `${p.cantidad === 1 ? 'Queda' : 'Quedan'} ${formatoCantidad(p.cantidad, p.unidad)}`;
    const categoria = p.categoria_id && this.inventario.nombreCategoria().get(p.categoria_id);
    return categoria ? `${queda} · ${categoria}` : queda;
  }

  protected quienAgrego(item: ItemManual): string {
    return `Lo agregó ${this.inventario.nombrePersona(item.usuario_id)}`;
  }

  protected async agregar(evento: Event): Promise<void> {
    evento.preventDefault();
    const formulario = evento.target as HTMLFormElement;
    const texto = this.nuevo().trim();
    if (!texto || this.agregando()) return;
    this.agregando.set(true);
    const error = await this.lista.agregar(texto);
    this.agregando.set(false);
    if (error) {
      this.avisos.error(error);
      return;
    }
    // También en el DOM: si se escribe y se envía muy rápido, el enlace [value] no se entera.
    formulario.reset();
    this.nuevo.set('');
  }

  protected async marcar(item: ItemManual, comprado: boolean): Promise<void> {
    const error = await this.lista.marcar(item.id, comprado);
    if (error) this.avisos.error(error);
  }

  protected async quitar(item: ItemManual): Promise<void> {
    const error = await this.lista.quitar(item.id);
    if (error) this.avisos.error(error);
  }

  protected async quitarComprados(): Promise<void> {
    const cuantos = this.lista.comprados().length;
    const error = await this.lista.quitarComprados();
    if (error) this.avisos.error(error);
    else this.avisos.exito(cuantos === 1 ? 'Se quitó 1 cosa.' : `Se quitaron ${cuantos} cosas.`);
  }

  protected abrirCompra(p: Producto): void {
    this.comprandoId.set(p.id);
  }

  protected cerrarCompra(): void {
    this.comprandoId.set(null);
  }
}
