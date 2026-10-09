import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import { crearRespaldo, parsearRespaldo } from './respaldo';
import { reg } from './testHelpers';
import type { Datos } from './types';

const MENSAJE = 'El archivo no es un respaldo valido de Almacen Te.';

const datos: Datos = {
  insumos: CATALOGO_SEMILLA,
  productos: PRODUCTOS_SEMILLA,
  movimientos: [
    reg({ tipo: 'compra', insumoId: 'te', cantidad: 1000 }),
    reg({ tipo: 'produccion', productoId: 'stevia', lotes: 1, descuentos: { te: 150, stevia: 30 } }),
  ],
};

describe('respaldo v2', () => {
  it('round-trip exacto', () => {
    const r = crearRespaldo(datos, new Date('2026-10-08T12:00:00Z'));
    expect(r).toMatchObject({ formato: 'almacen-te', version: 2, exportado: '2026-10-08T12:00:00.000Z' });
    expect(parsearRespaldo(JSON.parse(JSON.stringify(r)))).toEqual(datos);
  });
});

describe('respaldo v1', () => {
  it('se migra: mismos movimientos, productos nuevos, sin consumoPorLote', () => {
    const insumosV1 = CATALOGO_SEMILLA.filter((i) => i.id !== 'stevia').map((i) => ({ ...i, consumoPorLote: 100 }));
    const movs = [reg({ tipo: 'produccion', lotes: 2, descuentos: { te: 300 } })];
    const parsed = parsearRespaldo({
      formato: 'almacen-te', version: 1, exportado: 'x', insumos: insumosV1, movimientos: movs,
      config: { capacidadObjetivo: 6 },
    });
    expect(parsed.movimientos).toEqual(movs);
    expect(parsed.productos.map((p) => p.id)).toEqual(['morena', 'stevia']);
    expect(parsed.productos[0].receta.te).toBe(100);
    expect(parsed.insumos.some((i) => 'consumoPorLote' in i)).toBe(false);
  });
});

describe('archivos invalidos', () => {
  it.each([
    ['objeto vacio', {}],
    ['null', null],
    ['otro formato', { formato: 'otro' }],
    ['version desconocida', { formato: 'almacen-te', version: 3, insumos: [], movimientos: [] }],
    ['sin movimientos', { formato: 'almacen-te', version: 2, insumos: [], productos: [] }],
    ['v2 sin productos', { formato: 'almacen-te', version: 2, insumos: [], movimientos: [] }],
  ])('%s => error legible', (_n, data) => {
    expect(() => parsearRespaldo(data)).toThrow(MENSAJE);
  });
});
