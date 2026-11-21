import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatoHoy } from '../../core/formato';
import { Hoy } from '../../core/hoy';
import { Avisos } from '../../shared/avisos';
import { InventarioStore } from '../../core/inventario.store';
import { ListaStore } from '../../core/lista.store';
import { Icono, NombreIcono } from '../../shared/icono';
import { Marca } from '../../shared/marca';

interface Seccion {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
  /** Qué cuenta el número de la pestaña, para lectores de pantalla. */
  insignia?: string;
}

/**
 * Estructura de la app con sesión: barra superior con la cuenta, pestañas
 * abajo en el celular y barra lateral en pantallas grandes.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Marca, Icono],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  protected readonly avisos = inject(Avisos);
  private readonly reloj = inject(Hoy);
  protected readonly hoy = computed(() => formatoHoy(this.reloj.fecha()));
  private readonly inventario = inject(InventarioStore);
  private readonly lista = inject(ListaStore);

  /** Lo que falta comprar: lo que se está acabando + lo agregado a mano. */
  protected readonly pendientes = computed(
    () => this.inventario.porComprar().length + this.lista.pendientes().length,
  );

  /** Número sobre el ícono de cada pestaña (0 = sin número). */
  protected insignia(ruta: string): number {
    if (ruta === '/lista') return this.pendientes();
    if (ruta === '/por-caducar') return this.inventario.urgentesPorCaducar();
    return 0;
  }

  protected readonly secciones: Seccion[] = [
    { ruta: '/inventario', etiqueta: 'Inventario', icono: 'inventario' },
    { ruta: '/lista', etiqueta: 'Súper', icono: 'carrito', insignia: 'por comprar' },
    {
      ruta: '/por-caducar',
      etiqueta: 'Por caducar',
      icono: 'caducidad',
      insignia: 'urgentes',
    },
  ];

  protected readonly nombre = computed(() => this.inventario.miNombre());
  protected readonly correo = computed(() => this.auth.usuario()?.email ?? '');
  protected readonly inicial = computed(() =>
    (this.nombre() || this.correo() || '?').charAt(0).toLocaleUpperCase('es-MX'),
  );
  protected readonly saliendo = signal(false);

  // Cambiar mi nombre desde el menú de la cuenta
  protected readonly editandoNombre = signal(false);
  protected readonly nombreNuevo = signal('');
  protected readonly errorNombre = signal<string | null>(null);
  protected readonly guardandoNombre = signal(false);
  private readonly campoNombre = viewChild<ElementRef<HTMLInputElement>>('campoNombre');

  constructor() {
    // Se cargan aquí para que el contador de la pestaña Súper sirva en cualquier sección.
    void this.inventario.iniciar();
    void this.lista.iniciar();
  }

  protected editarNombre(): void {
    this.nombreNuevo.set(this.nombre() ?? '');
    this.errorNombre.set(null);
    this.editandoNombre.set(true);
    afterNextRender(() => this.campoNombre()?.nativeElement.select(), {
      injector: this.injector,
    });
  }

  protected cancelarNombre(): void {
    this.editandoNombre.set(false);
    this.errorNombre.set(null);
  }

  protected async guardarNombre(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.guardandoNombre()) return;
    this.guardandoNombre.set(true);
    const error = await this.inventario.cambiarMiNombre(this.nombreNuevo());
    this.guardandoNombre.set(false);
    if (error) {
      this.errorNombre.set(error);
      return;
    }
    this.editandoNombre.set(false);
    this.avisos.exito(`Listo: la familia te verá como ${this.nombre()}.`);
  }

  protected async salir(): Promise<void> {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    await this.auth.salir();
    await this.router.navigateByUrl('/entrar');
  }
}
