import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icono } from './icono';

/** Logo de Mandado: canasta + nombre. */
@Component({
  selector: 'app-marca',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'marca' },
  template: `
    <app-icono class="marca-icono" nombre="canasta" />
    <span>Mandado</span>
  `,
})
export class Marca {}
