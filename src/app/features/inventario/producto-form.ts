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
import { UNIDADES, Unidad } from '../../core/formato';
import { DatosProducto, InventarioStore, Producto } from '../../core/inventario.store';
import { Avisos } from '../../shared/avisos';

/** Agregar (sin `producto`) o editar un producto. La cantidad solo se pide al agregar. */
@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoForm implements OnInit {
  readonly producto = input<Producto | null>(null);
  /** Se guardó o se quitó: el padre cierra la ventana. */
  readonly listo = output<void>();

  protected readonly store = inject(InventarioStore);
  private readonly avisos = inject(Avisos);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly unidades = UNIDADES;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly validar = signal(false);
  protected readonly confirmandoQuitar = signal(false);

  protected readonly form = this.fb.group({
    nombre: this.fb.control('', [Validators.required, Validators.maxLength(80)]),
    marca: this.fb.control('', [Validators.maxLength(60)]),
    categoria_id: this.fb.control<number | null>(null),
    ubicacion_id: this.fb.control<number | null>(null),
    unidad: this.fb.control<Unidad>('pieza'),
    cantidad: this.fb.control<number | null>(null, [Validators.min(0)]),
    minimo: this.fb.control<number | null>(null, [Validators.min(0)]),
    caduca_el: this.fb.control(''),
  });

  ngOnInit(): void {
    const p = this.producto();
    if (p) {
      this.form.patchValue({
        nombre: p.nombre,
        marca: p.marca ?? '',
        categoria_id: p.categoria_id,
        ubicacion_id: p.ubicacion_id,
        unidad: p.unidad,
        minimo: p.minimo || null,
        caduca_el: p.caduca_el ?? '',
      });
    }
  }

  protected get editando(): boolean {
    return this.producto() !== null;
  }

  protected errorDe(campo: 'nombre' | 'cantidad' | 'minimo'): string | null {
    if (!this.validar()) return null;
    const control = this.form.controls[campo];
    if (control.hasError('required')) return 'Escribe el nombre del producto.';
    if (control.hasError('maxlength')) return 'Es muy largo; usa menos de 80 letras.';
    if (control.hasError('min')) return 'No puede ser negativo.';
    return null;
  }

  protected async guardar(): Promise<void> {
    this.validar.set(true);
    if (this.form.invalid || this.guardando()) return;

    const v = this.form.getRawValue();
    const datos: DatosProducto = {
      nombre: v.nombre.trim(),
      marca: v.marca.trim() || null,
      categoria_id: v.categoria_id,
      ubicacion_id: v.ubicacion_id,
      unidad: v.unidad,
      minimo: v.minimo ?? 0,
      caduca_el: v.caduca_el || null,
    };
    if (!datos.nombre) {
      this.form.controls.nombre.setValue('');
      return;
    }

    this.error.set(null);
    this.guardando.set(true);
    const p = this.producto();
    const error = p
      ? await this.store.actualizar(p.id, datos)
      : await this.store.crear(datos, v.cantidad ?? 0);
    this.guardando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }
    this.avisos.exito(
      p ? `Se guardaron los cambios de ${datos.nombre}.` : `Se agregó ${datos.nombre}.`,
    );
    this.listo.emit();
  }

  protected async quitar(): Promise<void> {
    const p = this.producto();
    if (!p || this.guardando()) return;
    this.guardando.set(true);
    const error = await this.store.quitar(p.id);
    this.guardando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.avisos.exito(`Se quitó ${p.nombre} del inventario.`);
    this.listo.emit();
  }
}
