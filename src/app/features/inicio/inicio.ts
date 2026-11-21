import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { Marca } from '../../shared/marca';

/**
 * Pantalla temporal después de entrar. En el paso 3 se convierte en la
 * estructura de la app (Inventario, Lista del súper, Por caducar).
 */
@Component({
  selector: 'app-inicio',
  imports: [Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--espacio-4);
      padding: max(var(--espacio-3), env(safe-area-inset-top)) var(--espacio-4) var(--espacio-3);
      border-bottom: 1px solid var(--color-borde);
      background: var(--color-superficie);
    }
    main {
      max-width: 40rem;
      margin: 0 auto;
      padding: var(--espacio-8) var(--espacio-4);
    }
  `,
  template: `
    <header class="barra">
      <app-marca />
      <button
        type="button"
        class="boton boton-secundario"
        (click)="salir()"
        [attr.aria-busy]="saliendo()"
      >
        Salir
      </button>
    </header>
    <main>
      <div class="encabezado">
        <h1>Hola{{ nombre() ? ', ' + nombre() : '' }}</h1>
        <p>
          Ya entraste. Muy pronto aquí vas a ver el inventario, la lista del súper y lo que está por
          caducar.
        </p>
      </div>
    </main>
  `,
})
export class Inicio {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);
  protected readonly nombre = signal<string | null>(null);
  protected readonly saliendo = signal(false);

  constructor() {
    void this.cargarNombre();
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
