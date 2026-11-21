import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { InventarioStore } from '../../core/inventario.store';
import { ListaStore } from '../../core/lista.store';
import { InventarioFalso, enDias, producto } from '../../../testing/inventario-falso';
import { ListaFalsa, item } from '../../../testing/lista-falsa';
import { Hoy } from '../../core/hoy';
import { Shell } from './shell';

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let salir: ReturnType<typeof vi.fn>;
  let inventario: InventarioFalso;
  let lista: ListaFalsa;

  async function crear(nombre: string | null) {
    salir = vi.fn().mockResolvedValue(undefined);
    inventario = new InventarioFalso();
    lista = new ListaFalsa();
    inventario.miNombre.set(nombre);
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        { provide: InventarioStore, useValue: inventario },
        { provide: ListaStore, useValue: lista },
        {
          provide: AuthService,
          useValue: { usuario: signal({ id: 'u1', email: 'mama@correo.com' }), salir },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;

  it('muestra las tres secciones con ícono y texto', async () => {
    await crear('Mamá');
    const enlaces = [...raiz().querySelectorAll<HTMLAnchorElement>('nav a')];
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/inventario',
      '/lista',
      '/por-caducar',
    ]);
    expect(enlaces.map((a) => a.textContent?.trim())).toEqual([
      'Inventario',
      'Súper',
      'Por caducar',
    ]);
    expect(enlaces.every((a) => a.querySelector('app-icono'))).toBe(true);
    expect(raiz().querySelector('nav')?.getAttribute('aria-label')).toBe('Secciones');
  });

  it('muestra la inicial y el nombre del perfil en la cuenta', async () => {
    await crear('Mamá');
    expect(raiz().querySelector('.avatar')?.textContent?.trim()).toBe('M');
    expect(raiz().querySelector('.cuenta')?.getAttribute('aria-label')).toBe('Tu cuenta: Mamá');
    expect(raiz().querySelector('.menu-nombre')?.textContent).toBe('Mamá');
    expect(raiz().querySelector('.menu-correo')?.textContent).toBe('mama@correo.com');
  });

  it('sin perfil usa el correo', async () => {
    await crear(null);
    expect(raiz().querySelector('.avatar')?.textContent?.trim()).toBe('M');
    expect(raiz().querySelector('.cuenta')?.getAttribute('aria-label')).toBe(
      'Tu cuenta: mama@correo.com',
    );
  });

  it('Salir cierra la sesión y lleva a /entrar', async () => {
    await crear('Mamá');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const boton = [...raiz().querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Salir'),
    ) as HTMLButtonElement;
    boton.click();
    await fixture.whenStable();
    expect(salir).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith('/entrar');
  });

  it('la pestaña Súper muestra cuántas cosas hay por comprar', async () => {
    await crear('Mamá');
    expect(raiz().querySelector('.insignia')).toBeNull();

    inventario.productos.set([producto({ cantidad: 0, minimo: 1 })]);
    lista.items.set([item({ id: 1 }), item({ id: 2, comprado: true })]);
    await fixture.whenStable();

    const super_ = raiz().querySelector('a[href="/lista"]')!;
    expect(super_.querySelector('.insignia')?.textContent?.trim()).toBe('2');
    expect(super_.textContent).toContain('2 por comprar');
  });

  it('la pestaña Por caducar cuenta lo urgente (3 días o menos, o ya caducado)', async () => {
    await crear('Mamá');
    inventario.productos.set([
      producto({ id: 1, caduca_el: enDias(-2) }),
      producto({ id: 2, caduca_el: enDias(2) }),
      producto({ id: 3, caduca_el: enDias(6) }),
    ]);
    await fixture.whenStable();
    const pestana = raiz().querySelector('a[href="/por-caducar"]')!;
    expect(pestana.querySelector('.insignia-aviso')?.textContent?.trim()).toBe('2');
    expect(pestana.textContent).toContain('2 urgentes');
  });

  it('muestra la fecha de hoy y la cambia cuando cambia el día', async () => {
    await crear('Mamá');
    const hoy = TestBed.inject(Hoy);
    hoy.fecha.set(new Date(2026, 10, 20));
    await fixture.whenStable();

    const fecha = raiz().querySelector('time.hoy')!;
    expect(fecha.getAttribute('datetime')).toBe('2026-11-20');
    // El lector de pantalla oye "Hoy es Viernes, 20 nov" (la versión larga se oculta con CSS).
    expect(fecha.querySelector('.hoy-dia')?.textContent).toBe('Viernes');
    expect(fecha.querySelector('.hoy-corta')?.textContent).toBe('20 nov');
    expect(fecha.querySelector('.hoy-larga')?.textContent).toBe('20 de noviembre');
    expect(fecha.textContent).toMatch(/^Hoy es Viernes, 20 nov/);

    hoy.fecha.set(new Date(2026, 10, 21));
    await fixture.whenStable();
    expect(fecha.getAttribute('datetime')).toBe('2026-11-21');
    expect(fecha.querySelector('.hoy-dia')?.textContent).toBe('Sábado');
  });

  it('cada quien cambia su nombre desde el menú', async () => {
    await crear('Luis');
    const cambiar = vi.spyOn(inventario, 'cambiarMiNombre');
    const boton = (texto: string) =>
      [...raiz().querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;

    boton('Cambiar mi nombre').click();
    await fixture.whenStable();
    const campo = raiz().querySelector('#mi-nombre') as HTMLInputElement;
    expect(campo.value).toBe('Luis');

    campo.value = 'Chata';
    campo.dispatchEvent(new Event('input'));
    raiz().querySelector('.form-nombre')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(cambiar).toHaveBeenCalledWith('Chata');
    expect(raiz().querySelector('.menu-nombre')?.textContent).toBe('Chata');
    expect(raiz().querySelector('.avatar')?.textContent?.trim()).toBe('C');
  });

  it('muestra el error si el nombre no sirve', async () => {
    await crear('Luis');
    vi.spyOn(inventario, 'cambiarMiNombre').mockResolvedValue('Escribe un nombre.');
    [...raiz().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cambiar mi nombre'))!
      .click();
    await fixture.whenStable();
    raiz().querySelector('.form-nombre')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(raiz().querySelector('#mi-nombre-error')?.textContent).toBe('Escribe un nombre.');
  });
});
