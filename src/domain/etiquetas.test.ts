import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR, PRODUCTOS_SEMILLA } from './seed';
import { calcularEstadoInsumos, calcularEstadoProductos } from './estadoProducto';
import { calcularSugerencia } from './sugerencia';
import { armarProduccion } from './receta';

const [morena, stevia] = PRODUCTOS_SEMILLA;
const HOLGADO: Record<string, number> = {
  te: 10000, azucar: 10000, stevia: 10000, limon: 10000, pet: 10000, tapa: 10000, agua: 10000,
  'etiqueta-normal': 10000, 'etiqueta-sin-azucar': 10000,
};

describe('semilla de etiquetas', () => {
  it('son dos insumos en piezas: pedido de 100 pzas a $80, umbral 2', () => {
    const esperadas = [
      [ETIQUETA_NORMAL, 'etiqueta-normal', 'Etiqueta te normal'],
      [ETIQUETA_SIN_AZUCAR, 'etiqueta-sin-azucar', 'Etiqueta te sin azucar'],
    ] as const;
    for (const [etiqueta, id, nombre] of esperadas) {
      expect(etiqueta).toEqual({
        id, nombre, unidadBase: 'pza', presentacionNombre: 'pedido 100 pzas',
        presentacionCantidad: 100, presentacionPrecio: 80, umbralLotes: 2, activo: true,
      });
      expect(CATALOGO_SEMILLA).toContainEqual(etiqueta);
    }
  });

  it('cada receta lleva solo la etiqueta de su producto, 18 por lote', () => {
    expect(morena.receta['etiqueta-normal']).toBe(18);
    expect(morena.receta['etiqueta-sin-azucar']).toBeUndefined();
    expect(stevia.receta['etiqueta-sin-azucar']).toBe(18);
    expect(stevia.receta['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en los lotes', () => {
  const estado = (stocks: Record<string, number>) =>
    calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, ...stocks });

  it('con 36 etiquetas morena alcanza 2 lotes y la etiqueta es su cuello de botella', () => {
    const [m, s] = estado({ 'etiqueta-normal': 36 });
    expect(m.lotes).toBe(2);
    expect(m.cuelloBotella?.id).toBe('etiqueta-normal');
    // stevia no depende de la etiqueta normal: sus lotes no cambian con ella
    expect(s.lotes).toBe(estado({ 'etiqueta-normal': 0 })[1].lotes);
  });

  it('con 17 etiquetas no alcanza ni para un lote: 0 lotes y rojo', () => {
    const [m] = estado({ 'etiqueta-normal': 17 });
    expect(m.lotes).toBe(0);
    expect(m.color).toBe('rojo');
  });

  it('stock negativo de etiquetas: 0 lotes, linea negativa y rojo, sin lanzar', () => {
    const [m] = estado({ 'etiqueta-normal': -5 });
    expect(m.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({ lotes: 0, negativo: true, color: 'rojo' });
    expect(m.lotes).toBe(0);
  });

  it('en la lista de insumos: 36 piezas son 2 lotes, amarillo y piden compra', () => {
    const e = calcularEstadoInsumos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, 'etiqueta-normal': 36 })
      .find((x) => x.insumo.id === 'etiqueta-normal')!;
    expect(e).toMatchObject({ lotes: 2, color: 'amarillo', necesitaCompra: true });
  });
});

describe('producir descuenta etiquetas', () => {
  it('1 lote de stevia descuenta 18 de la etiqueta sin azucar y ninguna de la normal', () => {
    const d = armarProduccion(stevia, CATALOGO_SEMILLA, 1).descuentos;
    expect(d['etiqueta-sin-azucar']).toBe(18);
    expect(d['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en Que comprar', () => {
  const sug = (stocks: Record<string, number>, productos = PRODUCTOS_SEMILLA) =>
    calcularSugerencia(CATALOGO_SEMILLA, productos, { ...HOLGADO, ...stocks });

  it('sin etiquetas entra sola: faltante 54, 1 pedido de 100, $80', () => {
    const s = sug({ 'etiqueta-normal': 0 });
    expect(s.lineas.map((l) => l.insumo.id)).toEqual(['etiqueta-normal']);
    expect(s.lineas[0]).toMatchObject({ faltante: 54, presentaciones: 1, unidadesCompradas: 100, costoEstimado: 80 });
  });

  it('con 53 etiquetas (2 lotes, en el umbral) entra: faltante 1, 1 pedido', () => {
    const s = sug({ 'etiqueta-normal': 53 });
    expect(s.lineas[0]).toMatchObject({ insumo: ETIQUETA_NORMAL, lotesActuales: 2, faltante: 1, presentaciones: 1 });
  });

  it('con 54 etiquetas (3 lotes, sobre el umbral) ya no aparece', () => {
    expect(sug({ 'etiqueta-normal': 54 }).lineas).toHaveLength(0);
  });

  it('redondea a pedidos completos: objetivo 6 lotes => 108 pzas => 2 pedidos, $160', () => {
    const s = sug({ 'etiqueta-normal': 0 }, [{ ...morena, objetivoLotes: 6 }, stevia]);
    expect(s.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({
      faltante: 108, presentaciones: 2, costoEstimado: 160,
    });
  });
});
