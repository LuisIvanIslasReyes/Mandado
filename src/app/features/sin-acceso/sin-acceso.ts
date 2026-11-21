import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Marca } from '../../shared/marca';

/** Para quien entró con un correo que no está en `miembros_familia`. */
@Component({
  selector: 'app-sin-acceso',
  imports: [Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .botones {
      display: grid;
      gap: var(--espacio-3);
    }
  `,
  template: `
    <main class="pantalla-acceso">
      <div class="tarjeta-acceso">
        <app-marca />

        <div class="encabezado">
          <h1>Tu correo todavía no tiene acceso</h1>
          <p>
            Entraste como <strong>{{ auth.usuario()?.email }}</strong
            >, pero ese correo no está en la lista de la familia. Pídele a quien administra Mandado
            que lo agregue.
          </p>
        </div>

        @if (aviso(); as mensaje) {
          <p class="mensaje mensaje-aviso" role="status">{{ mensaje }}</p>
        }

        <div class="botones">
          <button
            type="button"
            class="boton boton-primario"
            (click)="volverAIntentar()"
            [attr.aria-busy]="revisando()"
          >
            @if (revisando()) {
              <span class="giro" aria-hidden="true"></span>
              Revisando…
            } @else {
              Ya me dieron acceso
            }
          </button>
          <button type="button" class="boton boton-secundario" (click)="salir()">
            Salir y usar otro correo
          </button>
        </div>
      </div>
    </main>
  `,
})
export class SinAcceso {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly revisando = signal(false);
  protected readonly aviso = signal<string | null>(null);

  protected async volverAIntentar(): Promise<void> {
    if (this.revisando()) return;
    this.revisando.set(true);
    this.aviso.set(null);
    const esFamilia = await this.auth.reverificarFamilia();
    this.revisando.set(false);
    if (esFamilia === false) {
      this.aviso.set('Tu correo todavía no aparece en la lista. Intenta de nuevo en un rato.');
      return;
    }
    await this.router.navigateByUrl('/');
  }

  protected async salir(): Promise<void> {
    await this.auth.salir();
    await this.router.navigateByUrl('/entrar');
  }
}
