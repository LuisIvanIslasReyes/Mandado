import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icono } from './icono';

let siguienteId = 0;

/**
 * Ventana modal con el <dialog> nativo: atrapa el foco, se cierra con Esc,
 * con la X o tocando fuera. En el celular sale desde abajo.
 *
 * Se abre al aparecer; el padre la controla con @if y la quita en (cerrado).
 */
@Component({
  selector: 'app-dialogo',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogo.html',
  styleUrl: './dialogo.scss',
})
export class Dialogo {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);
  readonly cerrado = output<void>();

  protected readonly idTitulo = `dialogo-titulo-${++siguienteId}`;
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    afterNextRender(() => {
      const elemento = this.dialogo().nativeElement;
      if (typeof elemento.showModal === 'function') elemento.showModal();
      else elemento.setAttribute('open', ''); // entornos sin <dialog> (pruebas)
    });
  }

  cerrar(): void {
    const elemento = this.dialogo().nativeElement;
    if (typeof elemento.close === 'function' && elemento.open) elemento.close();
    else this.cerrado.emit();
  }

  /** Tocar el fondo oscuro (fuera del contenido) cierra. */
  protected alTocar(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement) this.cerrar();
  }
}
