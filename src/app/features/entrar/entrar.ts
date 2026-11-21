import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { rutaInternaSegura } from '../../core/auth.guards';
import { AuthService, LONGITUD_CODIGO } from '../../core/auth.service';
import { Marca } from '../../shared/marca';

/** Supabase permite un correo por minuto a la misma dirección. */
const ESPERA_REENVIO_SEGUNDOS = 60;

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, Marca],
  templateUrl: './entrar.html',
  styleUrl: './entrar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Entrar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly longitud = LONGITUD_CODIGO;
  protected readonly paso = signal<'correo' | 'codigo'>('correo');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly correoEnviado = signal('');
  protected readonly segundosReenvio = signal(0);
  private readonly validarCorreo = signal(false);
  private readonly validarCodigo = signal(false);

  protected readonly formCorreo = this.fb.group({
    correo: this.fb.control('', [Validators.required, Validators.email]),
  });
  protected readonly formCodigo = this.fb.group({
    codigo: this.fb.control('', [
      Validators.required,
      Validators.pattern(new RegExp(`^\\d{${LONGITUD_CODIGO}}$`)),
    ]),
  });

  private readonly campoCorreo = viewChild<ElementRef<HTMLInputElement>>('campoCorreo');
  private readonly campoCodigo = viewChild<ElementRef<HTMLInputElement>>('campoCodigo');
  private temporizador?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.temporizador));
  }

  /** Error del campo de correo, solo después de intentar enviar. */
  protected errorCorreo(): string | null {
    if (!this.validarCorreo()) return null;
    const campo = this.formCorreo.controls.correo;
    if (campo.hasError('required')) return 'Escribe tu correo.';
    if (campo.hasError('email')) return 'Revisa el correo; parece que le falta algo.';
    return null;
  }

  protected errorCodigo(): string | null {
    if (!this.validarCodigo()) return null;
    const campo = this.formCodigo.controls.codigo;
    if (campo.hasError('required')) return 'Escribe el código que te llegó.';
    if (campo.hasError('pattern')) return `El código tiene ${LONGITUD_CODIGO} números.`;
    return null;
  }

  protected async pedirCodigo(): Promise<void> {
    const campo = this.formCorreo.controls.correo;
    campo.setValue(campo.value.trim().toLowerCase());
    this.validarCorreo.set(true);
    if (campo.invalid) {
      this.enfocar(this.campoCorreo);
      return;
    }
    if (this.enviando()) return;

    this.error.set(null);
    this.enviando.set(true);
    const error = await this.auth.enviarCodigo(campo.value);
    this.enviando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }

    this.correoEnviado.set(campo.value);
    this.formCodigo.reset();
    this.validarCodigo.set(false);
    this.aviso.set(null);
    this.paso.set('codigo');
    this.iniciarEsperaReenvio();
    this.enfocar(this.campoCodigo);
  }

  /** Deja solo números (acepta pegar "123 456") y entra solo al completar el código. */
  protected alEscribirCodigo(): void {
    const campo = this.formCodigo.controls.codigo;
    const limpio = campo.value.replace(/\D/g, '').slice(0, LONGITUD_CODIGO);
    if (limpio !== campo.value) campo.setValue(limpio);
    if (limpio.length === LONGITUD_CODIGO) void this.entrar();
  }

  protected async entrar(): Promise<void> {
    const campo = this.formCodigo.controls.codigo;
    this.validarCodigo.set(true);
    if (campo.invalid) {
      this.enfocar(this.campoCodigo);
      return;
    }
    if (this.enviando()) return;

    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);
    const error = await this.auth.verificarCodigo(this.correoEnviado(), campo.value);
    if (error) {
      this.enviando.set(false);
      this.error.set(error);
      this.enfocar(this.campoCodigo, true);
      return;
    }

    const destino =
      this.auth.esFamilia() === false
        ? '/sin-acceso'
        : rutaInternaSegura(this.ruta.snapshot.queryParamMap.get('volver'));
    await this.router.navigateByUrl(destino);
  }

  protected async reenviar(): Promise<void> {
    if (this.segundosReenvio() > 0 || this.enviando()) return;
    this.error.set(null);
    this.aviso.set(null);
    this.enviando.set(true);
    const error = await this.auth.enviarCodigo(this.correoEnviado());
    this.enviando.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.formCodigo.reset();
    this.validarCodigo.set(false);
    this.aviso.set('Te mandamos un código nuevo. Usa el del correo más reciente.');
    this.iniciarEsperaReenvio();
    this.enfocar(this.campoCodigo);
  }

  protected usarOtroCorreo(): void {
    clearInterval(this.temporizador);
    this.segundosReenvio.set(0);
    this.error.set(null);
    this.aviso.set(null);
    this.paso.set('correo');
    this.enfocar(this.campoCorreo, true);
  }

  private iniciarEsperaReenvio(): void {
    clearInterval(this.temporizador);
    this.segundosReenvio.set(ESPERA_REENVIO_SEGUNDOS);
    this.temporizador = setInterval(() => {
      this.segundosReenvio.update((s) => s - 1);
      if (this.segundosReenvio() <= 0) clearInterval(this.temporizador);
    }, 1000);
  }

  /** Mueve el foco al campo cuando ya está en pantalla (cambia de paso con el teclado). */
  private enfocar(campo: Signal<ElementRef<HTMLInputElement> | undefined>, seleccionar = false) {
    afterNextRender(
      () => {
        const elemento = campo()?.nativeElement;
        elemento?.focus();
        if (seleccionar) elemento?.select();
      },
      { injector: this.injector },
    );
  }
}
