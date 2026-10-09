import { describe, it, expect } from 'vitest';
import { calcularStocks, stockDeInsumo, calcularDescuadre, ordenarLog } from './stock';
import { reg, conteo } from './testHelpers';

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
    expect(stockDeInsumo('nada', movs)).toBe(0);
  });

  it('un ajuste deja el stock corriente igual al fisico', () => {
    const movs = [
      reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 }),
      reg({ tipo: 'ajuste', insumoId: 'te', stockFisico: 940, descuadre: calcularDescuadre(940, 1000) }),
    ];
    expect(stockDeInsumo('te', movs)).toBe(940);
  });

  it('el orden lo da el timestamp, no la posicion en el arreglo', () => {
    const a = conteo('te', 100);
    const b = reg({ tipo: 'produccion', lotes: 1, descuentos: { te: 150 } });
    expect(ordenarLog([b, a]).map((r) => r.id)).toEqual([a.id, b.id]);
    expect(calcularStocks([b, a]).te).toBe(-50);
  });
});
