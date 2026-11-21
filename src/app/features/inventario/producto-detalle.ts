import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TIPOS_MOVIMIENTO,
  TipoMovimiento,
  estadoCaducidad,
  estadoStock,
  formatoCantidad,
  formatoDinero,
  formatoMomento,
  nombreUnidad,
  textoQueda,
} from '../../core/formato';
import { InventarioStore, Movimiento, Producto } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';
import { Icono } from '../../shared/icono';

const SIGNO: Record<TipoMovimiento, string> = {
  compra: '+',
  consumo: '−',
  merma: '−',
  ajuste: '=',
};

@Component({
  selector: 'app-producto-detalle',
  imports: [ReactiveFormsModule, Icono],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoDetalle implements OnInit {
  readonly producto = input.required<Producto>();
  /** Para abrir ya listo, p. ej. "Se echó a perder" con todo lo que hay. */
  readonly tipoInicial = input<TipoMovimiento>('consumo');
  readonly cantidadInicial = input<number | null>(null);
  /** Se registró un movimiento: el padre cierra la ventana. */
  readonly listo = output<void>();
  readonly editar = output<void>();

  protected readonly store = inject(InventarioStore);
  private readonly avisos = inject(Avisos);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly tipos = TIPOS_MOVIMIENTO;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly validar = signal(false);
  protected readonly historial = signal<Movimiento[] | 'cargando' | 'error'>('cargando');

  protected readonly form = this.fb.group({
    tipo: this.fb.control<TipoMovimiento>('consumo'),
    cantidad: this.fb.control<number | null>(null, [Validators.required]),
    precio: this.fb.control<number | null>(null, [Validators.min(0)]),
    nota: this.fb.control('', [Validators.maxLength(200)]),
  });
  protected readonly tipo = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });

  protected readonly resumen = computed(() => {
    const p = this.producto();
    return {
      cantidad: formatoCantidad(p.cantidad, p.unidad),
      stock: estadoStock(p),
      caducidad: estadoCaducidad(p.caduca_el),
      ubicacion: (p.ubicacion_id && this.store.nombreUbicacion().get(p.ubicacion_id)) || '—',
      categoria: (p.categoria_id && this.store.nombreCategoria().get(p.categoria_id)) || '—',
      minimo: p.minimo > 0 ? formatoCantidad(p.minimo, p.unidad) : 'Sin aviso',
    };
  });

  protected readonly unidadPlural = computed(() => nombreUnidad(this.producto().unidad));

  protected readonly etiquetaCantidad = computed(() =>
    this.tipo() === 'ajuste' ? '¿Cuánto hay ahora?' : '¿Cuánto?',
  );

  constructor() {
    // Carga el historial al abrir (y si cambia de producto).
    effect(() => {
      const id = this.producto().id;
      untracked(() => void this.cargarHistorial(id));
    });
  }

  ngOnInit(): void {
    this.form.patchValue({ tipo: this.tipoInicial(), cantidad: this.cantidadInicial() });
  }

  protected describir(m: Movimiento): { titulo: string; detalle: string } {
    const p = this.producto();
    const tipo = TIPOS_MOVIMIENTO.find((t) => t.valor === m.tipo)!;
    const partes = [this.store.nombrePersona(m.usuario_id), formatoMomento(m.created_at)];
    if (m.precio !== null) partes.push(formatoDinero(m.precio));
    return {
      titulo: `${SIGNO[m.tipo]} ${formatoCantidad(m.cantidad, p.unidad)} · ${tipo.etiqueta}`,
      detalle: partes.join(' · '),
    };
  }

  protected errorCantidad(): string | null {
    if (!this.validar()) return null;
    const valor = this.form.controls.cantidad.value;
    if (valor === null) return 'Escribe la cantidad.';
    if (valor < 0) return 'No puede ser negativa.';
    if (valor === 0 && this.tipo() !== 'ajuste') return 'Tiene que ser más de 0.';
    return null;
  }

  protected async guardar(): Promise<void> {
    this.validar.set(true);
    if (this.errorCantidad() || this.form.invalid || this.guardando()) return;

    const { tipo, cantidad, precio, nota } = this.form.getRawValue();
    const p = this.producto();
    this.error.set(null);
    this.guardando.set(true);
    const error = await this.store.registrar(p.id, tipo, cantidad!, {
      precio: tipo === 'compra' ? precio : null,
      nota: nota.trim(),
    });
    this.guardando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }

    const actual = this.store.productos().find((x) => x.id === p.id) ?? p;
    this.avisos.exito(textoQueda(p.nombre, actual.cantidad, actual.unidad));
    this.listo.emit();
  }

  private async cargarHistorial(id: number): Promise<void> {
    this.historial.set('cargando');
    const resultado = await this.store.movimientos(id);
    this.historial.set(typeof resultado === 'string' ? 'error' : resultado);
  }
}
