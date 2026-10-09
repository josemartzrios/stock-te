import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import {
  calcularEstadoInsumos,
  calcularEstadoProductos,
  colorSemaforo,
  lotesParaStock,
  lotesRestantes,
} from './estadoProducto';

const A = { te: 100, azucar: 1792, limon: 795, pet: 35, tapa: 35, agua: 190, stevia: 0 };
const B = { te: 1000, stevia: 100, limon: 1000, pet: 100, tapa: 100, agua: 200 };

describe('lotesRestantes / colorSemaforo', () => {
  it('floor del stock entre el consumo; negativo => 0 con bandera', () => {
    expect(lotesRestantes(1792, 800)).toEqual({ lotes: 2, negativo: false });
    expect(lotesRestantes(-5, 800)).toEqual({ lotes: 0, negativo: true });
  });

  it('consumo 0 no limita (Infinity, no NaN)', () => {
    expect(lotesRestantes(100, 0)).toEqual({ lotes: Infinity, negativo: false });
  });

  it('semaforo: rojo 0/negativo, amarillo <= umbral, verde >', () => {
    expect(colorSemaforo(0, false, 2)).toBe('rojo');
    expect(colorSemaforo(3, true, 2)).toBe('rojo');
    expect(colorSemaforo(1, false, 2)).toBe('amarillo');
    expect(colorSemaforo(2, false, 2)).toBe('amarillo');
    expect(colorSemaforo(3, false, 2)).toBe('verde');
  });
});

describe('calcularEstadoProductos', () => {
  it('stock real: ambos en 0 lotes, rojo, cuello de botella te', () => {
    const [morena, stevia] = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, A);
    expect(morena.producto.id).toBe('morena');
    expect(morena.lotes).toBe(0);
    expect(morena.cuelloBotella?.id).toBe('te');
    expect(morena.color).toBe('rojo');
    expect(stevia.lotes).toBe(0);
    expect(stevia.color).toBe('rojo');
  });

  it('con otro stock cada producto tiene su propio cuello de botella', () => {
    const [morena, stevia] = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...B, azucar: 1792 });
    expect(stevia.lotes).toBe(3); // floor(100 / 30)
    expect(stevia.cuelloBotella?.id).toBe('stevia');
    expect(morena.lotes).toBe(2); // azucar 1792 / 800
    expect(morena.cuelloBotella?.id).toBe('azucar');
    expect(morena.lineas.find((l) => l.insumo.id === 'te')?.lotes).toBe(6);
  });

  it('amarillo si algun insumo de la receta esta en o bajo su umbral', () => {
    const [, stevia] = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, B);
    expect(stevia.color).toBe('verde'); // stevia 3 lotes > umbral 2
    const [, bajo] = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...B, stevia: 70 });
    expect(bajo.color).toBe('amarillo');
    expect(bajo.hayQueComprar).toBe(true);
  });

  it('receta con cantidad 0 no divide entre cero ni devuelve Infinity', () => {
    const p = { ...PRODUCTOS_SEMILLA[0], receta: { te: 0 } };
    const [e] = calcularEstadoProductos(CATALOGO_SEMILLA, [p], B);
    expect(e.lotes).toBe(0);
    expect(Number.isFinite(e.lotes)).toBe(true);
    expect(e.cuelloBotella).toBeNull();
  });

  it('producto sin receta => 0 lotes', () => {
    const [e] = calcularEstadoProductos(CATALOGO_SEMILLA, [{ ...PRODUCTOS_SEMILLA[0], receta: {} }], B);
    expect(e.lotes).toBe(0);
  });

  it('stock negativo: rojo, 0 lotes, linea negativa, sin lanzar', () => {
    const [morena] = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...B, azucar: 800, te: -50 });
    expect(morena.color).toBe('rojo');
    expect(morena.lotes).toBe(0);
    expect(morena.lineas.find((l) => l.insumo.id === 'te')?.negativo).toBe(true);
  });

  it('un producto inactivo no aparece', () => {
    const ps = [PRODUCTOS_SEMILLA[0], { ...PRODUCTOS_SEMILLA[1], activo: false }];
    expect(calcularEstadoProductos(CATALOGO_SEMILLA, ps, B).map((e) => e.producto.id)).toEqual(['morena']);
  });
});

describe('calcularEstadoInsumos', () => {
  const porId = (stocks: Record<string, number>, productos = PRODUCTOS_SEMILLA) =>
    Object.fromEntries(calcularEstadoInsumos(CATALOGO_SEMILLA, productos, stocks).map((e) => [e.insumo.id, e]));

  it('agua usa el peor caso entre productos (stevia a 10 L)', () => {
    const e = porId(A);
    expect(e.agua.lotes).toBe(19);
    expect(e.agua.color).toBe('verde');
  });

  it('azucar solo la usa morena: 2 lotes, amarillo, necesita compra', () => {
    const e = porId(A);
    expect(e.azucar.lotes).toBe(2);
    expect(e.azucar.color).toBe('amarillo');
    expect(e.azucar.necesitaCompra).toBe(true);
  });

  it('un insumo que ningun producto usa => lotes null y sin alerta', () => {
    const e = porId(A, [PRODUCTOS_SEMILLA[0]]);
    expect(e.stevia.lotes).toBeNull();
    expect(e.stevia.necesitaCompra).toBe(false);
    expect(e.stevia.color).toBe('verde');
  });
});

describe('lotesParaStock', () => {
  it('agua con 190 L => 19 (peor caso: stevia a 10 L)', () => {
    expect(lotesParaStock('agua', PRODUCTOS_SEMILLA, 190)).toBe(19);
  });

  it('azucar solo la usa morena', () => {
    expect(lotesParaStock('azucar', PRODUCTOS_SEMILLA, 1792)).toBe(2);
  });

  it('insumo que ningun producto activo usa => null', () => {
    expect(lotesParaStock('stevia', [PRODUCTOS_SEMILLA[0]], 100)).toBeNull();
    expect(lotesParaStock('stevia', [{ ...PRODUCTOS_SEMILLA[1], activo: false }], 100)).toBeNull();
  });

  it('stock negativo => 0', () => {
    expect(lotesParaStock('te', PRODUCTOS_SEMILLA, -10)).toBe(0);
  });
});
