import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatoHoy } from '../../core/formato';
import { Hoy } from '../../core/hoy';
import { Avisos } from '../../shared/avisos';
import { InventarioStore } from '../../core/inventario.store';
import { ListaStore } from '../../core/lista.store';
import { SupabaseService } from '../../core/supabase.service';
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
  private readonly supabase = inject(SupabaseService).client;
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

  protected readonly nombre = signal<string | null>(null);
  protected readonly correo = computed(() => this.auth.usuario()?.email ?? '');
  protected readonly inicial = computed(() =>
    (this.nombre() || this.correo() || '?').charAt(0).toLocaleUpperCase('es-MX'),
  );
  protected readonly saliendo = signal(false);

  constructor() {
    void this.cargarNombre();
    // Se cargan aquí para que el contador de la pestaña Súper sirva en cualquier sección.
    void this.inventario.iniciar();
    void this.lista.iniciar();
  }

  private async cargarNombre(): Promise<void> {
    const id = this.auth.usuario()?.id;
    if (!id) return;
    const { data } = await this.supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', id)
      .maybeSingle();
    this.nombre.set(data?.nombre ?? null);
  }

  protected async salir(): Promise<void> {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    await this.auth.salir();
    await this.router.navigateByUrl('/entrar');
  }
}
