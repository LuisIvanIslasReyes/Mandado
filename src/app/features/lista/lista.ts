import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Vacio } from '../../shared/vacio';

@Component({
  selector: 'app-lista',
  imports: [Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-encabezado">
        <h1>Lista del súper</h1>
        <p>Lo que falta comprar.</p>
      </header>
      <app-vacio
        icono="carrito"
        titulo="No falta nada por ahora"
        texto="Cuando algo baje de su mínimo aparecerá aquí, junto con lo que agreguen a mano."
      />
    </div>
  `,
})
export class Lista {}
