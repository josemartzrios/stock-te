import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';
import { calcularStocks } from '../domain/stock';
import { ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR } from '../domain/seed';
import { catalogoSinEtiquetas, productosSinEtiquetas } from '../domain/testHelpers';
import type { MovimientoRegistro } from '../domain';
import { crearAlmacenDB } from './esquema';
import { crearRepositorioDexie } from './repositorioDexie';

const CONSUMO: Record<string, number> = { te: 160, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5 };

const movimientos: MovimientoRegistro[] = [
  { id: 'a', timestamp: '2026-01-01T00:00:01.000Z', mov: { tipo: 'compra', insumoId: 'te', cantidad: 1000 } },
  { id: 'b', timestamp: '2026-01-01T00:00:02.000Z', mov: { tipo: 'produccion', lotes: 2, descuentos: { te: 320, azucar: 1600 } } },
  { id: 'c', timestamp: '2026-01-01T00:00:03.000Z', mov: { tipo: 'ajuste', insumoId: 'te', stockFisico: 650, descuadre: -30 } },
];

// Bases tal como las dejaban las versiones anteriores, para probar el upgrade a la actual.
const v2 = (nombre: string) => {
  const db = new Dexie(nombre);
  db.version(1).stores({ insumos: 'id, activo', movimientos: 'id, timestamp', config: 'key' });
  db.version(2).stores({ productos: 'id, activo', config: null });
  return db;
};
const v3 = (nombre: string) => {
  const db = v2(nombre);
  db.version(3).stores({});
  return db;
};

describe('upgrade de Dexie v1 -> v2', () => {
  it('migra insumos y productos sin tocar el log', async () => {
    const nombre = 'migracion-v1';
    const v1 = new Dexie(nombre);
    v1.version(1).stores({ insumos: 'id, activo', movimientos: 'id, timestamp', config: 'key' });
    await v1.table('insumos').bulkAdd(
      catalogoSinEtiquetas().filter((i) => i.id !== 'stevia' && i.id !== 'hielo').map((i) => ({ ...i, consumoPorLote: CONSUMO[i.id] })),
    );
    await v1.table('movimientos').bulkAdd(movimientos);
    await v1.table('config').put({ key: 'capacidadObjetivo', value: 6 });
    v1.close();

    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();

    expect(datos.productos.map((p) => p.id).sort()).toEqual(['morena', 'stevia']);
    expect(datos.productos.find((p) => p.id === 'morena')?.receta.te).toBe(160);
    expect(datos.productos.find((p) => p.id === 'morena')?.receta['etiqueta-normal']).toBe(18);
    expect(datos.insumos).toHaveLength(10); // + hielo (v3) + 2 etiquetas (v4)
    expect(datos.insumos.some((i) => 'consumoPorLote' in i)).toBe(false);
    expect([...datos.movimientos].sort((x, y) => x.id.localeCompare(y.id))).toEqual(movimientos);
    expect(calcularStocks(datos.movimientos).te).toBe(1000 - 320 - 30);
    db.close();
  });
});

describe('upgrade de Dexie v2 -> v3', () => {
  it('agrega el hielo sin tocar el resto ni el log', async () => {
    const nombre = 'migracion-v2';
    const db2 = v2(nombre);
    const sinHielo = catalogoSinEtiquetas().filter((i) => i.id !== 'hielo').map((i) =>
      i.id === 'te' ? { ...i, presentacionPrecio: 999 } : i,
    );
    await db2.table('insumos').bulkAdd(sinHielo);
    await db2.table('movimientos').bulkAdd(movimientos);
    db2.close();

    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();
    expect(datos.insumos.find((i) => i.id === 'hielo')?.hechoEnCasa).toBe(true);
    expect(datos.insumos.find((i) => i.id === 'te')?.presentacionPrecio).toBe(999);
    expect(datos.insumos).toHaveLength(sinHielo.length + 3); // + hielo (v3) + 2 etiquetas (v4)
    expect(datos.movimientos).toHaveLength(movimientos.length);
    db.close();
  });

  it('una base v2 vacia se queda vacia para que la siembre la inicializacion', async () => {
    const nombre = 'migracion-v2-vacia';
    const db2 = v2(nombre);
    await db2.open();
    db2.close();
    const db = crearAlmacenDB(nombre);
    expect(await crearRepositorioDexie(db).leerTodo()).toMatchObject({ insumos: [] });
    db.close();
  });
});

describe('upgrade de Dexie v3 -> v4', () => {
  it('agrega etiquetas y recetas sin tocar el resto ni el log', async () => {
    const nombre = 'migracion-v3';
    const db3 = v3(nombre);
    const catalogo = catalogoSinEtiquetas().map((i) => (i.id === 'te' ? { ...i, presentacionPrecio: 999 } : i));
    const productos = productosSinEtiquetas().map((p) => (p.id === 'morena' ? { ...p, receta: { ...p.receta, te: 160 } } : p));
    await db3.table('insumos').bulkAdd(catalogo);
    await db3.table('productos').bulkAdd(productos);
    await db3.table('movimientos').bulkAdd(movimientos);
    db3.close();

    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();
    expect(datos.insumos).toHaveLength(catalogo.length + 2);
    expect(datos.insumos.find((i) => i.id === 'etiqueta-normal')).toEqual(ETIQUETA_NORMAL);
    expect(datos.insumos.find((i) => i.id === 'etiqueta-sin-azucar')).toEqual(ETIQUETA_SIN_AZUCAR);
    expect(datos.insumos.find((i) => i.id === 'te')?.presentacionPrecio).toBe(999);
    expect(datos.productos.find((p) => p.id === 'morena')?.receta).toEqual({ ...productos[0].receta, 'etiqueta-normal': 18 });
    expect(datos.productos.find((p) => p.id === 'stevia')?.receta).toEqual({ ...productos[1].receta, 'etiqueta-sin-azucar': 18 });
    expect([...datos.movimientos].sort((x, y) => x.id.localeCompare(y.id))).toEqual(movimientos);
    expect(calcularStocks(datos.movimientos)['etiqueta-normal']).toBeUndefined();
    db.close();
  });

  it('una base v3 vacia se queda vacia para que la siembre la inicializacion', async () => {
    const nombre = 'migracion-v3-vacia';
    const db3 = v3(nombre);
    await db3.open();
    db3.close();
    const db = crearAlmacenDB(nombre);
    expect(await crearRepositorioDexie(db).leerTodo()).toMatchObject({ insumos: [], productos: [] });
    db.close();
  });

  it('sin catalogo pero con productos y log: no agrega etiquetas y conserva todo', async () => {
    const nombre = 'migracion-v3-sin-catalogo';
    const db3 = v3(nombre);
    await db3.table('productos').bulkAdd(productosSinEtiquetas());
    await db3.table('movimientos').bulkAdd(movimientos);
    db3.close();
    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();
    expect(datos.insumos).toEqual([]);
    expect(datos.productos).toHaveLength(2);
    expect(datos.movimientos).toHaveLength(movimientos.length);
    db.close();
  });

  it('un producto con receta malformada no impide abrir la base', async () => {
    const nombre = 'migracion-v3-receta-rota';
    const db3 = v3(nombre);
    await db3.table('insumos').bulkAdd(catalogoSinEtiquetas());
    await db3.table('productos').bulkAdd([{ id: 'morena', nombre: 'x', objetivoLotes: 3, activo: false }]);
    await db3.table('movimientos').bulkAdd(movimientos);
    db3.close();
    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();
    expect(datos.insumos).toHaveLength(catalogoSinEtiquetas().length + 2);
    expect(datos.movimientos).toHaveLength(movimientos.length);
    db.close();
  });
});
