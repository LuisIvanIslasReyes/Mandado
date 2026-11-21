import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NombreIcono =
  | 'canasta'
  | 'inventario'
  | 'carrito'
  | 'caducidad'
  | 'salir'
  | 'cerrar'
  | 'mas'
  | 'menos'
  | 'buscar'
  | 'editar';

/**
 * Íconos de Lucide (licencia ISC) dibujados en línea: no hay descargas y
 * toman el color del texto. Son decorativos (aria-hidden); el texto de al
 * lado da el significado.
 */
@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (nombre()) {
        @case ('canasta') {
          <svg:path d="m15 11-1 9" />
          <svg:path d="m19 11-4-7" />
          <svg:path d="M2 11h20" />
          <svg:path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
          <svg:path d="M4.5 15.5h15" />
          <svg:path d="m5 11 4-7" />
          <svg:path d="m9 11 1 9" />
        }
        @case ('inventario') {
          <svg:path
            d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
          />
          <svg:path d="M12 22V12" />
          <svg:path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
          <svg:path d="m7.5 4.27 9 5.15" />
        }
        @case ('carrito') {
          <svg:circle cx="8" cy="21" r="1" />
          <svg:circle cx="19" cy="21" r="1" />
          <svg:path
            d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
          />
        }
        @case ('caducidad') {
          <svg:path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
          <svg:path d="M16 2v4" />
          <svg:path d="M8 2v4" />
          <svg:path d="M3 10h5" />
          <svg:path d="M17.5 17.5 16 16.3V14" />
          <svg:circle cx="16" cy="16" r="6" />
        }
        @case ('salir') {
          <svg:path d="m16 17 5-5-5-5" />
          <svg:path d="M21 12H9" />
          <svg:path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        }
        @case ('cerrar') {
          <svg:path d="M18 6 6 18" />
          <svg:path d="m6 6 12 12" />
        }
        @case ('mas') {
          <svg:path d="M5 12h14" />
          <svg:path d="M12 5v14" />
        }
        @case ('menos') {
          <svg:path d="M5 12h14" />
        }
        @case ('buscar') {
          <svg:circle cx="11" cy="11" r="8" />
          <svg:path d="m21 21-4.3-4.3" />
        }
        @case ('editar') {
          <svg:path
            d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
          />
          <svg:path d="m15 5 4 4" />
        }
      }
    </svg>
  `,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
}
