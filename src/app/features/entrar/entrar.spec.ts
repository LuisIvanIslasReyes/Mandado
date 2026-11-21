import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Entrar } from './entrar';

describe('Entrar', () => {
  let fixture: ComponentFixture<Entrar>;
  let auth: {
    enviarCodigo: ReturnType<typeof vi.fn>;
    verificarCodigo: ReturnType<typeof vi.fn>;
    esFamilia: ReturnType<typeof signal<boolean | null>>;
  };
  let navegar: ReturnType<typeof vi.spyOn>;

  async function crear(volver: string | null = null) {
    auth = {
      enviarCodigo: vi.fn().mockResolvedValue(null),
      verificarCodigo: vi.fn().mockResolvedValue(null),
      esFamilia: signal<boolean | null>(true),
    };
    await TestBed.configureTestingModule({
      imports: [Entrar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(volver ? { volver } : {}) } },
        },
      ],
    }).compileComponents();
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Entrar);
    await fixture.whenStable();
  }

  const $ = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement | null;

  async function escribir(selector: string, valor: string) {
    const campo = $(selector) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function enviar() {
    ($('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function llegarAlCodigo() {
    await escribir('#correo', '  Mama@Correo.com ');
    await enviar();
  }

  it('pide el correo antes de enviar nada', async () => {
    await crear();
    await enviar();
    expect($('#correo-error')?.textContent).toContain('Escribe tu correo');
    expect($('#correo')?.getAttribute('aria-invalid')).toBe('true');
    expect(auth.enviarCodigo).not.toHaveBeenCalled();
  });

  it('manda el código al correo limpio y pasa al paso del código', async () => {
    await crear();
    await llegarAlCodigo();
    expect(auth.enviarCodigo).toHaveBeenCalledWith('mama@correo.com');
    expect($('h1')?.textContent).toContain('Revisa tu correo');
    expect($('strong')?.textContent).toBe('mama@correo.com');
    expect($('#codigo')).not.toBeNull();
  });

  it('muestra el error del servidor y se queda en el correo', async () => {
    await crear();
    auth.enviarCodigo.mockResolvedValue('Pediste muchos códigos seguidos.');
    await llegarAlCodigo();
    expect($('[role="alert"]')?.textContent).toContain('Pediste muchos códigos');
    expect($('#correo')).not.toBeNull();
  });

  it('acepta un código pegado con espacios y entra solo al completarlo', async () => {
    await crear('/lista');
    await llegarAlCodigo();
    await escribir('#codigo', '123 456');
    expect(($('#codigo') as HTMLInputElement).value).toBe('123456');
    expect(auth.verificarCodigo).toHaveBeenCalledWith('mama@correo.com', '123456');
    expect(navegar).toHaveBeenCalledWith('/lista');
  });

  it('un código incompleto no se envía', async () => {
    await crear();
    await llegarAlCodigo();
    await escribir('#codigo', '123');
    await enviar();
    expect($('#codigo-error')?.textContent).toContain('6 números');
    expect(auth.verificarCodigo).not.toHaveBeenCalled();
  });

  it('un código incorrecto muestra el error y no navega', async () => {
    await crear();
    auth.verificarCodigo.mockResolvedValue('El código no es correcto o ya venció.');
    await llegarAlCodigo();
    await escribir('#codigo', '000000');
    expect($('[role="alert"]')?.textContent).toContain('no es correcto');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('manda a /sin-acceso si el correo no es de la familia', async () => {
    await crear();
    auth.esFamilia.set(false);
    await llegarAlCodigo();
    await escribir('#codigo', '123456');
    expect(navegar).toHaveBeenCalledWith('/sin-acceso');
  });

  it('no deja reenviar antes de un minuto', async () => {
    await crear();
    await llegarAlCodigo();
    const reenviar = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLElement) =>
      b.textContent?.includes('Reenviar'),
    ) as HTMLButtonElement;
    expect(reenviar.disabled).toBe(true);
    expect(reenviar.textContent).toMatch(/Reenviar en \d+ s/);
  });
});
