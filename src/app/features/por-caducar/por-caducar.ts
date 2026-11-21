import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { estadoCaducidad, formatoCantidad } from '../../core/formato';
import { Hoy } from '../../core/hoy';
import { InventarioStore, Producto } from '../../core/inventario.store';
import { Dialogo } from '../../shared/dialogo';
import { Vacio } from '../../shared/vacio';
import { ProductoDetalle } from '../inventario/producto-detalle';
import { ProductoForm } from '../inventario/producto-form';

interface Fila {
  producto: Producto;
  dias: number;
  cuando: string;
  detalle: string;
}

type Ventana = { tipo: 'detalle' | 'editar'; id: number };

@Component({
  selector: 'app-por-caducar',
  imports: [Vacio, Dialogo, ProductoDetalle, ProductoForm],
  templateUrl: './por-caducar.html',
  styleUrl: './por-caducar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PorCaducar {
  protected readonly store = inject(InventarioStore);
  protected readonly ventana = signal<Ventana | null>(null);
  private readonly reloj = inject(Hoy);

  private readonly filas = computed<Fila[]>(() => {
    const ubicaciones = this.store.nombreUbicacion();
    const hoy = this.reloj.fecha();
    return this.store.porCaducar().map(({ producto: p, dias }) => {
      const lugar = p.ubicacion_id && ubicaciones.get(p.ubicacion_id);
      const hay = `Hay ${formatoCantidad(p.cantidad, p.unidad)}`;
      return {
        producto: p,
        dias,
        cuando: estadoCaducidad(p.caduca_el, hoy)?.texto ?? '',
        detalle: lugar ? `${hay} · ${lugar}` : hay,
      };
    });
  });

  protected readonly secciones = computed(() => {
    const filas = this.filas();
    return [
      {
        id: 'vencido',
        titulo: 'Ya caducó',
        ayuda: 'Revisa si todavía sirve; si no, regístralo como "Se echó a perder".',
        filas: filas.filter((f) => f.dias < 0),
      },
      {
        id: 'pronto',
        titulo: 'Próximos 3 días',
        ayuda: 'Úsalo primero.',
        filas: filas.filter((f) => f.dias >= 0 && f.dias <= 3),
      },
      {
        id: 'semana',
        titulo: 'Esta semana',
        ayuda: null,
        filas: filas.filter((f) => f.dias > 3),
      },
    ].filter((s) => s.filas.length);
  });

  protected readonly abierto = computed(() => {
    const v = this.ventana();
    return v ? (this.store.productos().find((p) => p.id === v.id) ?? null) : null;
  });

  /** Si ya caducó, el detalle abre listo para registrar que se echó a perder todo. */
  protected readonly abiertoVencido = computed(() => {
    const p = this.abierto();
    return !!p && this.filas().some((f) => f.producto.id === p.id && f.dias < 0);
  });

  constructor() {
    void this.store.iniciar();
  }

  protected abrir(ventana: Ventana): void {
    this.ventana.set(ventana);
  }

  protected cerrar(): void {
    this.ventana.set(null);
  }
}
