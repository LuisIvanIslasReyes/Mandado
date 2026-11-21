import type { Database } from './database.types';

export type Unidad = Database['public']['Enums']['unidad_medida'];
export type TipoMovimiento = Database['public']['Enums']['tipo_movimiento'];

const numero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const fechaCorta = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const diaSemana = new Intl.DateTimeFormat('es-MX', { weekday: 'long' });
const diaMesCorto = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const diaMesLargo = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });
const hora = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });

const NOMBRES_UNIDAD: Record<Unidad, [singular: string, plural: string]> = {
  pieza: ['pieza', 'piezas'],
  paquete: ['paquete', 'paquetes'],
  kg: ['kg', 'kg'],
  g: ['g', 'g'],
  litro: ['litro', 'litros'],
  ml: ['ml', 'ml'],
};

/** Opciones para el selector de unidad. */
export const UNIDADES: { valor: Unidad; etiqueta: string }[] = [
  { valor: 'pieza', etiqueta: 'Piezas' },
  { valor: 'paquete', etiqueta: 'Paquetes' },
  { valor: 'kg', etiqueta: 'Kilos (kg)' },
  { valor: 'g', etiqueta: 'Gramos (g)' },
  { valor: 'litro', etiqueta: 'Litros' },
  { valor: 'ml', etiqueta: 'Mililitros (ml)' },
];

/** Cómo se dice cada movimiento en la app. */
export const TIPOS_MOVIMIENTO: { valor: TipoMovimiento; etiqueta: string; pasado: string }[] = [
  { valor: 'consumo', etiqueta: 'Usé', pasado: 'Usó' },
  { valor: 'compra', etiqueta: 'Compré', pasado: 'Compró' },
  { valor: 'merma', etiqueta: 'Se echó a perder', pasado: 'Se echó a perder' },
  { valor: 'ajuste', etiqueta: 'Conté', pasado: 'Contó' },
];

/** "1 pieza", "2 piezas", "0.5 kg", "400 g". */
export function formatoCantidad(cantidad: number, unidad: Unidad): string {
  const [singular, plural] = NOMBRES_UNIDAD[unidad];
  return `${numero.format(cantidad)} ${cantidad === 1 ? singular : plural}`;
}

/** "litros", "piezas", "kg" (o en singular). */
export function nombreUnidad(unidad: Unidad, plural = true): string {
  return NOMBRES_UNIDAD[unidad][plural ? 1 : 0];
}

/** Aviso tras un movimiento: "Leche: queda 1 litro", "Arroz: quedan 2 kg", "Yogur: se acabó". */
export function textoQueda(nombre: string, cantidad: number, unidad: Unidad): string {
  if (cantidad <= 0) return `${nombre}: se acabó`;
  return `${nombre}: ${cantidad === 1 ? 'queda' : 'quedan'} ${formatoCantidad(cantidad, unidad)}`;
}

export function formatoDinero(valor: number): string {
  return dinero.format(valor);
}

/** Cuánto suman o restan los botones rápidos − y +. */
export function pasoRapido(unidad: Unidad): number {
  return unidad === 'g' || unidad === 'ml' ? 100 : 1;
}

/** Lo mismo que hace el trigger `aplicar_movimiento` en la base de datos. */
export function aplicarMovimiento(actual: number, tipo: TipoMovimiento, cantidad: number): number {
  if (tipo === 'compra') return actual + cantidad;
  if (tipo === 'ajuste') return cantidad;
  return Math.max(actual - cantidad, 0);
}

export type EstadoStock = 'agotado' | 'bajo' | 'ok';

/** Igual que la vista `lista_super`: va a la lista si queda el mínimo o menos. */
export function estadoStock(producto: { cantidad: number; minimo: number }): EstadoStock {
  if (producto.cantidad <= 0) return 'agotado';
  if (producto.minimo > 0 && producto.cantidad <= producto.minimo) return 'bajo';
  return 'ok';
}

/** Días de hoy a una fecha 'AAAA-MM-DD' (negativo si ya pasó), según el día local. */
export function diasHasta(fecha: string, hoy = new Date()): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const objetivo = Date.UTC(anio, mes - 1, dia);
  const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo - base) / 86_400_000);
}

export interface EstadoCaducidad {
  nivel: 'vencido' | 'pronto' | 'ok';
  texto: string;
}

/** "Pronto" son 3 días o menos, igual que la vista `por_caducar`. */
export function estadoCaducidad(fecha: string | null, hoy = new Date()): EstadoCaducidad | null {
  if (!fecha) return null;
  const dias = diasHasta(fecha, hoy);
  if (dias < 0) {
    return { nivel: 'vencido', texto: dias === -1 ? 'Caducó ayer' : `Caducó hace ${-dias} días` };
  }
  if (dias === 0) return { nivel: 'pronto', texto: 'Caduca hoy' };
  if (dias === 1) return { nivel: 'pronto', texto: 'Caduca mañana' };
  if (dias <= 3) return { nivel: 'pronto', texto: `Caduca en ${dias} días` };
  return { nivel: 'ok', texto: `Caduca el ${formatoFecha(fecha)}` };
}

/** 'AAAA-MM-DD' → "12 nov". */
export function formatoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return fechaCorta.format(Date.UTC(anio, mes - 1, dia));
}

/** La fecha de hoy para la barra superior: "Jueves", "20 nov" / "20 de noviembre". */
export function formatoHoy(fecha: Date): {
  dia: string;
  corta: string;
  larga: string;
  iso: string;
} {
  const dia = diaSemana.format(fecha);
  return {
    dia: dia.charAt(0).toLocaleUpperCase('es-MX') + dia.slice(1),
    corta: diaMesCorto.format(fecha).replace('.', ''),
    larga: diaMesLargo.format(fecha),
    iso: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`,
  };
}

/** Fecha y hora de un movimiento: "hoy, 2:30 p.m.", "ayer, 9:05 a.m." o "12 nov". */
export function formatoMomento(iso: string, ahora = new Date()): string {
  const momento = new Date(iso);
  const local = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dias = diasHasta(local(momento), ahora);
  if (dias === 0) return `hoy, ${hora.format(momento)}`;
  if (dias === -1) return `ayer, ${hora.format(momento)}`;
  return formatoFecha(local(momento));
}

/** Para buscar sin importar acentos ni mayúsculas: "Jabón" encuentra "jabon". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-MX').trim();
}
