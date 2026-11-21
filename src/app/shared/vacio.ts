import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from './icono';

/** Estado vacío: qué hay aquí y qué hacer. Las acciones van como contenido. */
@Component({
  selector: 'app-vacio',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--espacio-3);
      padding: var(--espacio-12) var(--espacio-4);
      border: 1px dashed var(--color-borde-campo);
      border-radius: var(--radio);
      text-align: center;
    }
    .icono {
      width: 3rem;
      height: 3rem;
      padding: var(--espacio-3);
      border-radius: 50%;
      background: var(--color-primario-suave);
      color: var(--color-primario);
    }
    h2 {
      font-size: var(--texto-lg);
    }
    p {
      max-width: 32ch;
      color: var(--color-texto-suave);
    }
  `,
  template: `
    <app-icono class="icono" [nombre]="icono()" />
    <h2>{{ titulo() }}</h2>
    <p>{{ texto() }}</p>
    <ng-content />
  `,
})
export class Vacio {
  readonly icono = input.required<NombreIcono>();
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
}
