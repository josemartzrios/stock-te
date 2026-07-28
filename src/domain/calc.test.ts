import { describe, it, expect } from 'vitest';
import {
  calcularStocks,
  stockDeInsumo,
  lotesRestantes,
  colorSemaforo,
  calcularDescuentos,
  calcularDescuadre,
  calcularEstado,
  calcularSugerencia,
} from './calc';
import { CATALOGO_SEMILLA } from './seed';
import type { Insumo, MovimientoRegistro } from './types';

// ---- Helpers de test ----

let contador = 0;
/** Crea un registro con timestamp creciente para forzar orden cronologico. */
function reg(mov: MovimientoRegistro['mov']): MovimientoRegistro {
  contador += 1;
  const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, contador)).toISOString();
  return { id: `m${contador}`, timestamp: ts, mov };
}

function insumo(over: Partial<Insumo> & Pick<Insumo, 'id'>): Insumo {
  return {
    nombre: over.id,
    unidadBase: 'g',
    consumoPorLote: 100,
    presentacionNombre: 'bolsa',
    presentacionCantidad: 1000,
    presentacionPrecio: 100,
    umbralLotes: 2,
    activo: true,
    ...over,
  };
}

// ---- Reducer de stock ----

describe('calcularStocks', () => {
  it('compra + produccion => stock correcto por insumo', () => {
    const movs = [
      reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 }),
      reg({ tipo: 'compra', insumoId: 'azucar', cantidad: 900 }),
      reg({ tipo: 'produccion', lotes: 2, descuentos: { te: 300, azucar: 1600 } }),
    ];
    const s = calcularStocks(movs);
    expect(s.te).toBe(700);
    expect(s.azucar).toBe(-700);
    expect(stockDeInsumo('te', movs)).toBe(700);
  });

  it('produccion de 2 lotes descuenta los 6 insumos en un solo evento', () => {
    const descuentos = calcularDescuentos(CATALOGO_SEMILLA, 2);
    expect(Object.keys(descuentos)).toHaveLength(6);
    expect(descuentos.te).toBe(300);
    expect(descuentos.azucar).toBe(1600);
    expect(descuentos.limon).toBe(44);
    expect(descuentos.pet).toBe(36);
    expect(descuentos.tapa).toBe(36);
    expect(descuentos.agua).toBe(19);

    // Se aplica como UN evento y descuenta todo a la vez.
    const movs = [reg({ tipo: 'produccion', lotes: 2, descuentos })];
    const s = calcularStocks(movs);
    expect(s.te).toBe(-300);
    expect(s.pet).toBe(-36);
  });

  it('el orden lo da el timestamp, no el orden del array', () => {
    const a = reg({ tipo: 'compra', insumoId: 'te', cantidad: 500 });
    const b = reg({ tipo: 'compra', insumoId: 'te', cantidad: 300 });
    // pasa desordenado
    expect(calcularStocks([b, a]).te).toBe(800);
  });
});

// ---- Ajuste / descuadre ----

describe('ajuste por conteo', () => {
  it('registra descuadre correcto y el stock posterior == fisico', () => {
    const compra = reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 });
    const teorico = stockDeInsumo('te', [compra]); // 1000
    const stockFisico = 940;
    const descuadre = calcularDescuadre(stockFisico, teorico); // -60
    expect(descuadre).toBe(-60);

    const ajuste = reg({ tipo: 'ajuste', insumoId: 'te', stockFisico, descuadre });
    expect(stockDeInsumo('te', [compra, ajuste])).toBe(940);
  });

  it('el descuadre nunca se recalcula: queda tal cual en el evento', () => {
    const ajuste = reg({ tipo: 'ajuste', insumoId: 'te', stockFisico: 100, descuadre: -60 });
    // aunque despues haya mas movimientos, el descuadre del evento es fijo
    if (ajuste.mov.tipo === 'ajuste') {
      expect(ajuste.mov.descuadre).toBe(-60);
    }
  });
});

// ---- Lotes / semaforo ----

describe('lotesRestantes y semaforo', () => {
  it('floor: 35/18 = 1 lote, no ~2', () => {
    expect(lotesRestantes(35, 18).lotes).toBe(1);
  });

  it('stock negativo tras produccion no truena: lotes = 0 con flag', () => {
    const r = lotesRestantes(-300, 150);
    expect(r.lotes).toBe(0);
    expect(r.negativo).toBe(true);
    expect(colorSemaforo(r.lotes, r.negativo, 3)).toBe('rojo');
  });

  it('colores: 0 lotes rojo, <=umbral amarillo, >umbral verde', () => {
    expect(colorSemaforo(0, false, 2)).toBe('rojo');
    expect(colorSemaforo(1, false, 2)).toBe('amarillo'); // fixture PET/tapa
    expect(colorSemaforo(2, false, 2)).toBe('amarillo');
    expect(colorSemaforo(5, false, 2)).toBe('verde');
  });
});

// ---- Snapshot de receta ----

describe('snapshot de receta editable', () => {
  it('cambiar consumoPorLote no recalcula producciones pasadas', () => {
    // receta v1: te = 150
    const recetaV1 = [insumo({ id: 'te', consumoPorLote: 150 })];
    const d1 = calcularDescuentos(recetaV1, 2); // te: 300
    const p1 = reg({ tipo: 'produccion', lotes: 2, descuentos: d1 });

    // se cambia la receta a 160 y se produce 1 lote mas
    const recetaV2 = [insumo({ id: 'te', consumoPorLote: 160 })];
    const d2 = calcularDescuentos(recetaV2, 1); // te: 160
    const p2 = reg({ tipo: 'produccion', lotes: 1, descuentos: d2 });

    // stock descuenta 300 + 160 = 460
    expect(calcularStocks([p1, p2]).te).toBe(-460);
    // el evento viejo NO cambia
    if (p1.mov.tipo === 'produccion') expect(p1.mov.descuentos.te).toBe(300);
  });
});

// ---- Sugerencia de compra ----

describe('calcularSugerencia', () => {
  it('redondea a presentaciones completas y suma costos', () => {
    const cat = [insumo({ id: 'te', consumoPorLote: 150, presentacionCantidad: 1000, presentacionPrecio: 154, umbralLotes: 3 })];
    // stock 100 -> objetivo 6 lotes = 900 -> faltan 800 -> 1 bolsa
    const movs = [reg({ tipo: 'ajuste', insumoId: 'te', stockFisico: 100, descuadre: 100 })];
    const sug = calcularSugerencia(cat, movs, { capacidadObjetivo: 6 });
    expect(sug.lineas).toHaveLength(1);
    expect(sug.lineas[0].presentaciones).toBe(1);
    expect(sug.lineas[0].costoEstimado).toBe(154);
    expect(sug.costoTotal).toBe(154);
  });

  it('excluye insumos que ya alcanzan el objetivo', () => {
    const cat = [insumo({ id: 'te', consumoPorLote: 150, umbralLotes: 2 })];
    const movs = [reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 })]; // ~6 lotes
    const sug = calcularSugerencia(cat, movs, { capacidadObjetivo: 6 });
    expect(sug.lineas).toHaveLength(0);
  });
});

// ---- Estado global ----

describe('calcularEstado', () => {
  it('lotesGlobal es el minimo y marca el cuello de botella', () => {
    const cat = [
      insumo({ id: 'te', consumoPorLote: 150 }),
      insumo({ id: 'azucar', consumoPorLote: 800 }),
    ];
    const movs = [
      reg({ tipo: 'ajuste', insumoId: 'te', stockFisico: 100, descuadre: 100 }), // 0 lotes
      reg({ tipo: 'ajuste', insumoId: 'azucar', stockFisico: 4000, descuadre: 4000 }), // 5 lotes
    ];
    const est = calcularEstado(cat, movs);
    expect(est.lotesGlobal).toBe(0);
    expect(est.cuelloBotella?.id).toBe('te');
    expect(est.hayQueComprar).toBe(true);
  });
});
