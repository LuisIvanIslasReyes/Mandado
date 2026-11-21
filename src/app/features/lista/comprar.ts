import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatoCantidad, nombreUnidad, pasoRapido } from '../../core/formato';
import { InventarioStore, Producto } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';

/** Para tener el doble del mínimo: lo justo para no volver a la lista mañana. */
export function cantidadSugerida(p: Pick<Producto, 'cantidad' | 'minimo' | 'unidad'>): number {
  const paso = pasoRapido(p.unidad);
  const falta = p.minimo * 2 - p.cantidad;
  return Math.max(Math.ceil(falta / paso) * paso, paso);
}

/** "Lo compré": registra la compra de un producto de la lista en el inventario. */
@Component({
  selector: 'app-comprar',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    form {
      display: grid;
      gap: var(--espacio-4);
    }
    .fila-campos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--espacio-3);
    }
    .campo-entrada {
      min-width: 0;
    }
    .con-sufijo {
      position: relative;
      .campo-entrada {
        padding-right: 4.5rem;
      }
      span {
        position: absolute;
        top: 50%;
        right: var(--espacio-4);
        color: var(--color-texto-suave);
        transform: translateY(-50%);
        pointer-events: none;
      }
    }
    .con-prefijo {
      position: relative;
      .campo-entrada {
        padding-left: calc(var(--espacio-4) + 0.75rem);
      }
      span {
        position: absolute;
        top: 50%;
        left: var(--espacio-4);
        color: var(--color-texto-suave);
        transform: translateY(-50%);
        pointer-events: none;
      }
    }
    .opcional {
      color: var(--color-texto-suave);
      font-weight: 400;
    }
  `,
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <p class="campo-ayuda">
        Hay {{ hay }}. Al guardar se suma al inventario y sale de la lista si ya alcanza.
      </p>
      <div class="fila-campos">
        <div class="campo">
          <label class="campo-etiqueta" for="comprar-cantidad">¿Cuánto compraste?</label>
          <div class="con-sufijo">
            <input
              id="comprar-cantidad"
              class="campo-entrada"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              formControlName="cantidad"
              [attr.aria-invalid]="errorCantidad() ? 'true' : null"
              [attr.aria-describedby]="errorCantidad() ? 'comprar-cantidad-error' : null"
            />
            <span aria-hidden="true">{{ unidad }}</span>
          </div>
          @if (errorCantidad(); as mensaje) {
            <p id="comprar-cantidad-error" class="campo-error">{{ mensaje }}</p>
          }
        </div>
        <div class="campo">
          <label class="campo-etiqueta" for="comprar-precio">
            Precio <span class="opcional">(opcional)</span>
          </label>
          <div class="con-prefijo">
            <span aria-hidden="true">$</span>
            <input
              id="comprar-precio"
              class="campo-entrada"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              formControlName="precio"
            />
          </div>
        </div>
      </div>

      @if (error(); as mensaje) {
        <p class="mensaje mensaje-error" role="alert">{{ mensaje }}</p>
      }

      <button type="submit" class="boton boton-primario boton-ancho" [attr.aria-busy]="guardando()">
        @if (guardando()) {
          <span class="giro" aria-hidden="true"></span>
          Guardando…
        } @else {
          Lo compré
        }
      </button>
    </form>
  `,
})
export class Comprar implements OnInit {
  readonly producto = input.required<Producto>();
  readonly listo = output<void>();

  private readonly store = inject(InventarioStore);
  private readonly avisos = inject(Avisos);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly validar = signal(false);
  protected hay = '';
  protected unidad = '';

  protected readonly form = this.fb.group({
    cantidad: this.fb.control<number | null>(null),
    precio: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  ngOnInit(): void {
    const p = this.producto();
    this.hay = formatoCantidad(p.cantidad, p.unidad);
    this.unidad = nombreUnidad(p.unidad);
    this.form.controls.cantidad.setValue(cantidadSugerida(p));
  }

  protected errorCantidad(): string | null {
    if (!this.validar()) return null;
    const valor = this.form.controls.cantidad.value;
    if (valor === null) return 'Escribe cuánto compraste.';
    if (valor <= 0) return 'Tiene que ser más de 0.';
    return null;
  }

  protected async guardar(): Promise<void> {
    this.validar.set(true);
    if (this.errorCantidad() || this.form.invalid || this.guardando()) return;
    const { cantidad, precio } = this.form.getRawValue();
    const p = this.producto();

    this.error.set(null);
    this.guardando.set(true);
    const error = await this.store.registrar(p.id, 'compra', cantidad!, { precio });
    this.guardando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    const actual = this.store.productos().find((x) => x.id === p.id) ?? p;
    this.avisos.exito(`${p.nombre}: ahora hay ${formatoCantidad(actual.cantidad, actual.unidad)}`);
    this.listo.emit();
  }
}
