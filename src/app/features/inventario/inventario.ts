import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Vacio } from '../../shared/vacio';

@Component({
  selector: 'app-inventario',
  imports: [Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-encabezado">
        <h1>Inventario</h1>
        <p>Lo que hay en la casa.</p>
      </header>
      <app-vacio
        icono="inventario"
        titulo="Todavía no hay productos"
        texto="Aquí vas a ver todo lo que hay en la casa: cuánto queda, dónde está y cuándo caduca."
      />
    </div>
  `,
})
export class Inventario {}
