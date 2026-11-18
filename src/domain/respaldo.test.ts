import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import { crearRespaldo, parsearRespaldo } from './respaldo';
import { catalogoSinEtiquetas, productosSinEtiquetas, reg } from './testHelpers';
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
    const insumosV1 = catalogoSinEtiquetas().filter((i) => i.id !== 'stevia' && i.id !== 'hielo').map((i) => ({ ...i, consumoPorLote: 100 }));
    const movs = [reg({ tipo: 'produccion', lotes: 2, descuentos: { te: 300 } })];
    const parsed = parsearRespaldo({
      formato: 'almacen-te', version: 1, exportado: 'x', insumos: insumosV1, movimientos: movs,
      config: { capacidadObjetivo: 6 },
    });
    expect(parsed.movimientos).toEqual(movs);
    expect(parsed.productos.map((p) => p.id)).toEqual(['morena', 'stevia']);
    expect(parsed.productos[0].receta.te).toBe(100);
    expect(parsed.insumos.some((i) => 'consumoPorLote' in i)).toBe(false);
    expect(parsed.productos[0].receta['etiqueta-normal']).toBe(18);
    expect(parsed.productos[1].receta['etiqueta-sin-azucar']).toBe(18);
    expect(parsed.insumos.filter((i) => i.id.startsWith('etiqueta'))).toHaveLength(2);
  });
});

describe('respaldos sin etiquetas', () => {
  it('un respaldo v2 sin etiquetas las agrega y no toca los movimientos', () => {
    const sin = { ...datos, insumos: catalogoSinEtiquetas(), productos: productosSinEtiquetas() };
    const parsed = parsearRespaldo(JSON.parse(JSON.stringify(crearRespaldo(sin))));
    expect(parsed.insumos.map((i) => i.id)).toEqual(expect.arrayContaining(['etiqueta-normal', 'etiqueta-sin-azucar']));
    expect(parsed.productos.map((p) => p.receta)).toEqual(PRODUCTOS_SEMILLA.map((p) => p.receta));
    expect(parsed.movimientos).toEqual(datos.movimientos);
  });

  it('un respaldo parcial sin catalogo (insumos vacios) se queda sin catalogo', () => {
    const parcial = { ...datos, insumos: [], productos: productosSinEtiquetas() };
    const parsed = parsearRespaldo(JSON.parse(JSON.stringify(crearRespaldo(parcial))));
    expect(parsed.insumos).toEqual([]);
    expect(parsed.productos).toEqual(productosSinEtiquetas());
    expect(parsed.movimientos).toEqual(datos.movimientos);
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
