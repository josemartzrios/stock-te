import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, HIELO, PRODUCTOS_SEMILLA } from './seed';
import { asegurarInsumosCasa } from './migracion';
import { calcularEstadoInsumos, calcularEstadoProductos } from './estadoProducto';
import { calcularSugerencia } from './sugerencia';
import { parsearRespaldo } from './respaldo';

const SIN_HIELO = CATALOGO_SEMILLA.filter((i) => i.id !== 'hielo');

describe('insumo hielo', () => {
  it('viene en la semilla: charolas, hecho en casa, sin receta', () => {
    expect(CATALOGO_SEMILLA.find((i) => i.id === 'hielo')).toEqual(HIELO);
    expect(HIELO.unidadBase).toBe('charolas');
    expect(HIELO.hechoEnCasa).toBe(true);
    for (const p of PRODUCTOS_SEMILLA) expect('hielo' in p.receta).toBe(false);
  });

  it('estado: verde si hay al menos una charola, rojo si no hay', () => {
    const estado = (hielo: number) =>
      calcularEstadoInsumos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { hielo }).find((e) => e.insumo.id === 'hielo')!;
    expect(estado(2).color).toBe('verde');
    expect(estado(0).color).toBe('rojo');
    expect(estado(-1).color).toBe('rojo');
  });

  it('nunca cuenta como compra pendiente ni entra a la sugerencia', () => {
    const estado = calcularEstadoInsumos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { hielo: 0 });
    expect(estado.find((e) => e.insumo.id === 'hielo')?.necesitaCompra).toBe(false);
    // Aunque alguien lo meta a una receta, no se sugiere comprarlo.
    const conHielo = PRODUCTOS_SEMILLA.map((p) => ({ ...p, receta: { ...p.receta, hielo: 1 } }));
    const sug = calcularSugerencia(CATALOGO_SEMILLA, conHielo, { hielo: 0 });
    expect(sug.lineas.some((l) => l.insumo.id === 'hielo')).toBe(false);
  });

  it('no afecta los lotes de los productos', () => {
    const stocks = {
      te: 1000, azucar: 5000, stevia: 300, limon: 1000, pet: 100, tapa: 100, agua: 100,
      'etiqueta-normal': 1000, 'etiqueta-sin-azucar': 1000,
    };
    const con = calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...stocks, hielo: 0 });
    const sin = calcularEstadoProductos(SIN_HIELO, PRODUCTOS_SEMILLA, stocks);
    expect(con.map((p) => p.lotes)).toEqual(sin.map((p) => p.lotes));
  });
});

describe('asegurarInsumosCasa', () => {
  it('agrega el hielo a un catalogo que no lo trae', () => {
    const r = asegurarInsumosCasa(SIN_HIELO);
    expect(r).toHaveLength(SIN_HIELO.length + 1);
    expect(r.at(-1)).toEqual(HIELO);
  });

  it('no duplica ni pisa un hielo ya existente (editado o desactivado)', () => {
    const editado = [...SIN_HIELO, { ...HIELO, nombre: 'Hielo cubitos', activo: false }];
    expect(asegurarInsumosCasa(editado)).toEqual(editado);
  });

  it('un catalogo vacio se deja vacio (lo siembra la inicializacion)', () => {
    expect(asegurarInsumosCasa([])).toEqual([]);
  });

  it('al importar un respaldo v2 sin hielo, aparece', () => {
    const datos = parsearRespaldo({
      formato: 'almacen-te', version: 2, exportado: 'x', insumos: SIN_HIELO, productos: PRODUCTOS_SEMILLA, movimientos: [],
    });
    expect(datos.insumos.some((i) => i.id === 'hielo')).toBe(true);
  });
});
