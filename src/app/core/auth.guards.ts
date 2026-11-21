import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Pantallas de la app: hace falta sesión y ser de la familia. */
export const soloFamilia: CanActivateFn = async (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;

  if (!auth.sesion()) {
    // La pantalla de inicio no necesita ?volver= ("/" redirige a /inventario).
    const volver = estado.url === '/' || estado.url === '/inventario' ? undefined : estado.url;
    return router.createUrlTree(['/entrar'], { queryParams: { volver } });
  }
  // `null` (no se pudo comprobar) deja pasar: RLS protege los datos de todas formas.
  if (auth.esFamilia() === false) return router.createUrlTree(['/sin-acceso']);
  return true;
};

/** /entrar: si ya hay sesión, no tiene caso mostrarla. */
export const soloSinSesion: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router); // inject() solo funciona antes del primer await
  await auth.listo;
  return auth.sesion() ? router.createUrlTree(['/']) : true;
};

/** /sin-acceso: solo para quien entró pero no está autorizado. */
export const soloSinAcceso: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo;

  if (!auth.sesion()) return router.createUrlTree(['/entrar']);
  if (auth.esFamilia() !== false) return router.createUrlTree(['/']);
  return true;
};

/** Solo acepta rutas internas para `?volver=`, nunca otro sitio. */
export function rutaInternaSegura(valor: string | null | undefined): string {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/';
}
