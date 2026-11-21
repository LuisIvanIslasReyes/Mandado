import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  texto: string;
  tipo: 'exito' | 'error';
}

/** Mensajes cortos que aparecen abajo y se van solos ("Leche: quedan 2 litros"). */
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly actual = signal<Aviso | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;
  private contador = 0;

  exito(texto: string): void {
    this.mostrar(texto, 'exito', 3500);
  }

  error(texto: string): void {
    this.mostrar(texto, 'error', 7000);
  }

  cerrar(): void {
    clearTimeout(this.temporizador);
    this.actual.set(null);
  }

  private mostrar(texto: string, tipo: Aviso['tipo'], duracion: number): void {
    clearTimeout(this.temporizador);
    this.actual.set({ id: ++this.contador, texto, tipo });
    this.temporizador = setTimeout(() => this.actual.set(null), duracion);
  }
}
