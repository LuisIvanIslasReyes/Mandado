import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthError, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

/** Debe coincidir con `otp_length` en supabase/config.toml (y en el panel de producción). */
export const LONGITUD_CODIGO = 6;

/**
 * Estado de la sesión para toda la app.
 *
 * Entrar es sin contraseña: se manda un código de 6 dígitos al correo y se
 * verifica aquí mismo. Funciona igual dentro de la PWA instalada, donde un
 * enlace mágico abriría el navegador en lugar de la app.
 *
 * `esFamilia` es solo para la interfaz (mandar a /sin-acceso). La seguridad
 * real la ponen las reglas RLS de la base de datos.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  private readonly _sesion = signal<Session | null>(null);
  /** `null` = no se pudo comprobar (p. ej. sin internet); RLS sigue protegiendo los datos. */
  private readonly _esFamilia = signal<boolean | null>(null);
  private verificacion: { usuarioId: string; promesa: Promise<void> } | null = null;

  readonly sesion = this._sesion.asReadonly();
  readonly usuario = computed(() => this._sesion()?.user ?? null);
  readonly esFamilia = this._esFamilia.asReadonly();

  /** Se cumple cuando ya se sabe si hay sesión guardada y si es de la familia. */
  readonly listo: Promise<void>;

  constructor() {
    this.listo = new Promise((resolve) => {
      this.supabase.auth.onAuthStateChange((evento, sesion) => {
        // Supabase pide no llamar a otros métodos suyos dentro de este callback,
        // así que el trabajo se difiere al siguiente ciclo.
        setTimeout(async () => {
          await this.aplicarSesion(sesion);
          if (evento === 'INITIAL_SESSION') resolve();
          if (evento === 'SIGNED_OUT') void this.router.navigateByUrl('/entrar');
        });
      });
    });
  }

  /** Manda el código al correo. Devuelve un mensaje de error o `null` si salió bien. */
  async enviarCodigo(email: string): Promise<string | null> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error ? mensajeDeError(error) : null;
  }

  /** Verifica el código. Al regresar sin error, la sesión y `esFamilia` ya están listos. */
  async verificarCodigo(email: string, codigo: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    });
    if (error) return mensajeDeError(error);
    await this.aplicarSesion(data.session);
    return null;
  }

  /** Vuelve a preguntar a la base si el usuario ya tiene acceso. */
  async reverificarFamilia(): Promise<boolean | null> {
    this.verificacion = null;
    await this.aplicarSesion(this._sesion());
    return this._esFamilia();
  }

  async salir(): Promise<void> {
    await this.supabase.auth.signOut();
    // SIGNED_OUT también limpia y redirige; esto evita esperar al callback.
    this._sesion.set(null);
    this._esFamilia.set(null);
    this.verificacion = null;
  }

  private async aplicarSesion(sesion: Session | null): Promise<void> {
    this._sesion.set(sesion);
    if (!sesion) {
      this._esFamilia.set(null);
      this.verificacion = null;
      return;
    }
    // Un refresco de token no cambia de usuario: no hace falta preguntar otra vez.
    const usuarioId = sesion.user.id;
    if (this.verificacion?.usuarioId !== usuarioId) {
      this.verificacion = { usuarioId, promesa: this.consultarFamilia() };
    }
    await this.verificacion.promesa;
  }

  private async consultarFamilia(): Promise<void> {
    const { data, error } = await this.supabase.rpc('es_familia');
    if (error) {
      this._esFamilia.set(null);
      this.verificacion = null; // reintentar en la próxima oportunidad
      return;
    }
    this._esFamilia.set(data);
  }
}

/** Traduce los errores de Supabase Auth a mensajes para la familia. */
export function mensajeDeError(error: Pick<AuthError, 'code' | 'status' | 'name'>): string {
  switch (error.code) {
    case 'otp_expired':
      return 'El código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Pediste muchos códigos seguidos. Espera un minuto y vuelve a intentar.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Ese correo no parece válido. Revísalo e intenta de nuevo.';
    case 'signup_disabled':
    case 'otp_disabled':
      return 'Por ahora no se pueden crear cuentas nuevas.';
  }
  if (error.status === 429) {
    return 'Pediste muchos códigos seguidos. Espera un minuto y vuelve a intentar.';
  }
  if (error.name === 'AuthRetryableFetchError' || !error.status) {
    return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  }
  return 'Algo salió mal. Intenta de nuevo en un momento.';
}
