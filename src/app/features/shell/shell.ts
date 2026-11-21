import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
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
  private readonly inventario = inject(InventarioStore);
  private readonly lista = inject(ListaStore);

  /** Lo que falta comprar: lo que se está acabando + lo agregado a mano. */
  protected readonly pendientes = computed(
    () => this.inventario.porComprar().length + this.lista.pendientes().length,
  );

  protected readonly secciones: Seccion[] = [
    { ruta: '/inventario', etiqueta: 'Inventario', icono: 'inventario' },
    { ruta: '/lista', etiqueta: 'Súper', icono: 'carrito' },
    { ruta: '/por-caducar', etiqueta: 'Por caducar', icono: 'caducidad' },
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
