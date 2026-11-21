import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Vacio } from '../../shared/vacio';

@Component({
  selector: 'app-por-caducar',
  imports: [Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-encabezado">
        <h1>Por caducar</h1>
        <p>Lo que vence en los próximos 3 días.</p>
      </header>
      <app-vacio
        icono="caducidad"
        titulo="Nada por caducar"
        texto="Cuando algo esté por vencer aparecerá aquí, para usarlo antes de que se eche a perder."
      />
    </div>
  `,
})
export class PorCaducar {}
