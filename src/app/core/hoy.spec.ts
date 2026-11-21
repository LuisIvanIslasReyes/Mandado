import { TestBed } from '@angular/core/testing';
import { Hoy, inicioDelDia } from './hoy';

describe('Hoy', () => {
  afterEach(() => vi.useRealTimers());

  function crear(ahora: Date) {
    vi.useFakeTimers();
    vi.setSystemTime(ahora);
    TestBed.configureTestingModule({});
    return TestBed.inject(Hoy);
  }

  it('empieza en la medianoche de hoy', () => {
    const hoy = crear(new Date(2026, 10, 20, 21, 30));
    expect(hoy.fecha()).toEqual(new Date(2026, 10, 20));
  });

  it('cambia solo al pasar la medianoche', () => {
    const hoy = crear(new Date(2026, 10, 20, 23, 59, 0));
    vi.advanceTimersByTime(30_000);
    expect(hoy.fecha()).toEqual(new Date(2026, 10, 20));
    vi.advanceTimersByTime(60_000);
    expect(hoy.fecha()).toEqual(new Date(2026, 10, 21));
  });

  it('sigue cambiando día tras día', () => {
    const hoy = crear(new Date(2026, 10, 20, 12, 0));
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(hoy.fecha()).toEqual(new Date(2026, 10, 22));
  });

  it('al volver a la app se pone al día (el celular pausa los temporizadores)', () => {
    const hoy = crear(new Date(2026, 10, 20, 22, 0));
    // Pasa la noche sin que corra el temporizador, como con la pantalla bloqueada.
    vi.setSystemTime(new Date(2026, 10, 21, 7, 0));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(hoy.fecha()).toEqual(new Date(2026, 10, 21));
  });
});

describe('inicioDelDia', () => {
  it('quita la hora', () => {
    expect(inicioDelDia(new Date(2026, 0, 5, 18, 45, 12))).toEqual(new Date(2026, 0, 5));
  });
});
