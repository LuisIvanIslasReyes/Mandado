import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { rutaInternaSegura, soloFamilia, soloSinAcceso, soloSinSesion } from './auth.guards';
import { AuthService } from './auth.service';

function configurar(conSesion: boolean, esFamilia: boolean | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          listo: Promise.resolve(),
          sesion: signal(conSesion ? { user: { id: 'u1' } } : null),
          esFamilia: signal(esFamilia),
        },
      },
    ],
  });
}

async function correr(guard: typeof soloFamilia, url = '/') {
  const resultado = await TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  if (resultado instanceof UrlTree) return TestBed.inject(Router).serializeUrl(resultado);
  return resultado;
}

describe('soloFamilia', () => {
  it('sin sesión manda a /entrar y recuerda a dónde iba', async () => {
    configurar(false, null);
    expect(await correr(soloFamilia, '/lista')).toBe('/entrar?volver=%2Flista');
  });

  it('sin sesión desde el inicio no agrega ?volver', async () => {
    configurar(false, null);
    expect(await correr(soloFamilia, '/')).toBe('/entrar');
    expect(await correr(soloFamilia, '/inventario')).toBe('/entrar');
  });

  it('con sesión pero sin acceso manda a /sin-acceso', async () => {
    configurar(true, false);
    expect(await correr(soloFamilia)).toBe('/sin-acceso');
  });

  it('deja pasar a la familia', async () => {
    configurar(true, true);
    expect(await correr(soloFamilia)).toBe(true);
  });

  it('deja pasar si no se pudo comprobar (sin internet); RLS protege los datos', async () => {
    configurar(true, null);
    expect(await correr(soloFamilia)).toBe(true);
  });
});

describe('soloSinSesion', () => {
  it('con sesión manda al inicio', async () => {
    configurar(true, true);
    expect(await correr(soloSinSesion)).toBe('/');
  });

  it('sin sesión muestra /entrar', async () => {
    configurar(false, null);
    expect(await correr(soloSinSesion)).toBe(true);
  });
});

describe('soloSinAcceso', () => {
  it('sin sesión manda a /entrar', async () => {
    configurar(false, null);
    expect(await correr(soloSinAcceso)).toBe('/entrar');
  });

  it('a la familia la manda al inicio', async () => {
    configurar(true, true);
    expect(await correr(soloSinAcceso)).toBe('/');
  });

  it('se muestra a quien no tiene acceso', async () => {
    configurar(true, false);
    expect(await correr(soloSinAcceso)).toBe(true);
  });
});

describe('rutaInternaSegura', () => {
  it('acepta rutas de la app', () => {
    expect(rutaInternaSegura('/lista?x=1')).toBe('/lista?x=1');
  });

  it('rechaza otros sitios y valores vacíos', () => {
    for (const valor of ['https://malo.com', '//malo.com', 'lista', '', null, undefined]) {
      expect(rutaInternaSegura(valor)).toBe('/');
    }
  });
});
