import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** La medianoche (hora local) del día de `fecha`. */
export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/**
 * El día de hoy para toda la app. Cambia solo a medianoche y al volver a la
 * app (el celular pausa los temporizadores cuando está bloqueado), así que
 * "Caduca mañana" se vuelve "Caduca hoy" sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class Hoy {
  readonly fecha = signal(inicioDelDia(new Date()));
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    const documento = inject(DOCUMENT);
    documento.addEventListener('visibilitychange', () => {
      if (documento.visibilityState === 'visible') this.revisar();
    });
    this.programar();
  }

  /** Pone la fecha al día si ya cambió. */
  revisar(): void {
    const hoy = inicioDelDia(new Date());
    if (hoy.getTime() !== this.fecha().getTime()) this.fecha.set(hoy);
  }

  private programar(): void {
    clearTimeout(this.temporizador);
    const ahora = new Date();
    const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    // Un segundo después de medianoche, para no quedarse en el día anterior.
    this.temporizador = setTimeout(
      () => {
        this.revisar();
        this.programar();
      },
      manana.getTime() - ahora.getTime() + 1000,
    );
  }
}
