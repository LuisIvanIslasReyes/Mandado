import {
  aplicarMovimiento,
  diasHasta,
  estadoCaducidad,
  estadoStock,
  formatoCantidad,
  formatoMomento,
  normalizar,
  pasoRapido,
  textoQueda,
} from './formato';

// 21 de noviembre de 2026, 10:00 hora local
const HOY = new Date(2026, 10, 21, 10, 0);

describe('formatoCantidad', () => {
  it('usa singular solo para 1', () => {
    expect(formatoCantidad(1, 'pieza')).toBe('1 pieza');
    expect(formatoCantidad(0, 'pieza')).toBe('0 piezas');
    expect(formatoCantidad(2, 'litro')).toBe('2 litros');
  });

  it('muestra decimales solo si hacen falta', () => {
    expect(formatoCantidad(1.5, 'kg')).toBe('1.5 kg');
    expect(formatoCantidad(400, 'g')).toBe('400 g');
  });
});

describe('pasoRapido', () => {
  it('gramos y mililitros van de 100 en 100; lo demás de 1 en 1', () => {
    expect(pasoRapido('g')).toBe(100);
    expect(pasoRapido('ml')).toBe(100);
    expect(pasoRapido('pieza')).toBe(1);
    expect(pasoRapido('kg')).toBe(1);
  });
});

describe('aplicarMovimiento (igual que el trigger)', () => {
  it('compra suma, ajuste fija, consumo y merma restan sin bajar de 0', () => {
    expect(aplicarMovimiento(2, 'compra', 3)).toBe(5);
    expect(aplicarMovimiento(2, 'ajuste', 7)).toBe(7);
    expect(aplicarMovimiento(2, 'consumo', 1)).toBe(1);
    expect(aplicarMovimiento(2, 'merma', 5)).toBe(0);
  });
});

describe('estadoStock', () => {
  it('agotado, bajo (el mínimo o menos) u ok', () => {
    expect(estadoStock({ cantidad: 0, minimo: 1 })).toBe('agotado');
    expect(estadoStock({ cantidad: 2, minimo: 2 })).toBe('bajo');
    expect(estadoStock({ cantidad: 3, minimo: 2 })).toBe('ok');
  });

  it('sin mínimo nunca está "bajo"', () => {
    expect(estadoStock({ cantidad: 0.1, minimo: 0 })).toBe('ok');
  });
});

describe('estadoCaducidad', () => {
  it('sin fecha no hay estado', () => {
    expect(estadoCaducidad(null, HOY)).toBeNull();
  });

  it('vencido, pronto (3 días o menos) u ok', () => {
    expect(estadoCaducidad('2026-11-20', HOY)).toEqual({ nivel: 'vencido', texto: 'Caducó ayer' });
    expect(estadoCaducidad('2026-11-15', HOY)?.texto).toBe('Caducó hace 6 días');
    expect(estadoCaducidad('2026-11-21', HOY)).toEqual({ nivel: 'pronto', texto: 'Caduca hoy' });
    expect(estadoCaducidad('2026-11-22', HOY)?.texto).toBe('Caduca mañana');
    expect(estadoCaducidad('2026-11-24', HOY)).toEqual({
      nivel: 'pronto',
      texto: 'Caduca en 3 días',
    });
    expect(estadoCaducidad('2026-11-25', HOY)?.nivel).toBe('ok');
  });

  it('cruza fin de mes sin errores', () => {
    expect(diasHasta('2026-12-01', HOY)).toBe(10);
  });
});

describe('formatoMomento', () => {
  it('hoy y ayer con hora; antes, solo la fecha', () => {
    expect(formatoMomento(new Date(2026, 10, 21, 8, 5).toISOString(), HOY)).toMatch(/^hoy, 8:05/);
    expect(formatoMomento(new Date(2026, 10, 20, 21, 0).toISOString(), HOY)).toMatch(/^ayer, /);
    expect(formatoMomento(new Date(2026, 10, 12, 9, 0).toISOString(), HOY)).toBe('12 nov');
  });
});

describe('normalizar', () => {
  it('ignora acentos, mayúsculas y espacios de los lados', () => {
    expect(normalizar('  Jabón PARA Trastes ')).toBe('jabon para trastes');
  });
});

describe('textoQueda', () => {
  it('singular, plural y "se acabó"', () => {
    expect(textoQueda('Leche', 1, 'litro')).toBe('Leche: queda 1 litro');
    expect(textoQueda('Arroz', 2.5, 'kg')).toBe('Arroz: quedan 2.5 kg');
    expect(textoQueda('Yogur', 0, 'ml')).toBe('Yogur: se acabó');
  });
});
