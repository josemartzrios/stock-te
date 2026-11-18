import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA } from './seed';
import { migrarInsumosV1, type InsumoV1 } from './migracion';
import { calcularStocks } from './stock';
import { catalogoSinEtiquetas, productosSinEtiquetas, reg } from './testHelpers';

const CONSUMO_V1: Record<string, number> = { te: 150, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5 };

function insumosV1(editar: Record<string, number> = {}): InsumoV1[] {
  return catalogoSinEtiquetas().filter((i) => i.id !== 'stevia' && i.id !== 'hielo').map((i) => ({
    ...i,
    consumoPorLote: editar[i.id] ?? CONSUMO_V1[i.id],
  }));
}

describe('migrarInsumosV1', () => {
  it('morena y stevia salen con las recetas semilla', () => {
    const { productos } = migrarInsumosV1(insumosV1());
    expect(productos.map((p) => p.id)).toEqual(['morena', 'stevia']);
    expect(productos[0].receta).toEqual(productosSinEtiquetas()[0].receta);
    expect(productos[1].receta).toEqual(productosSinEtiquetas()[1].receta);
    expect(productos.every((p) => p.objetivoLotes === 3 && p.activo)).toBe(true);
  });

  it('respeta un consumo editado (te 160) en ambas recetas', () => {
    const { productos } = migrarInsumosV1(insumosV1({ te: 160 }));
    expect(productos[0].receta.te).toBe(160);
    expect(productos[1].receta.te).toBe(160);
  });

  it('descarta consumos 0 de v1 (no son parte de la receta)', () => {
    const { productos } = migrarInsumosV1(insumosV1({ limon: 0 }));
    expect('limon' in productos[0].receta).toBe(false);
    expect('limon' in productos[1].receta).toBe(false);
  });

  it('quita consumoPorLote de los insumos y agrega stevia (7 en total)', () => {
    const { insumos } = migrarInsumosV1(insumosV1());
    expect(insumos).toHaveLength(7);
    expect(insumos.some((i) => 'consumoPorLote' in i)).toBe(false);
    expect(insumos.find((i) => i.id === 'stevia')?.unidadBase).toBe('ml');
  });

  it('no duplica stevia si el v1 ya la traia', () => {
    const conStevia = [...insumosV1(), { ...CATALOGO_SEMILLA.find((i) => i.id === 'stevia')!, consumoPorLote: 30 }];
    expect(migrarInsumosV1(conStevia).insumos.filter((i) => i.id === 'stevia')).toHaveLength(1);
  });

  it('el stock de un log v1 es el mismo antes y despues (el log no se toca)', () => {
    const movs = [
      reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 }),
      reg({ tipo: 'produccion', lotes: 2, descuentos: { te: 300, azucar: 1600 } }),
      reg({ tipo: 'ajuste', insumoId: 'te', stockFisico: 650, descuadre: -50 }),
    ];
    const antes = calcularStocks(movs);
    migrarInsumosV1(insumosV1());
    expect(calcularStocks(movs)).toEqual(antes);
    expect(antes.te).toBe(650);
  });
});
