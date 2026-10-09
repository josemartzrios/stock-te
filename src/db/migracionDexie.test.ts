import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';
import { calcularStocks } from '../domain/stock';
import { CATALOGO_SEMILLA } from '../domain/seed';
import type { MovimientoRegistro } from '../domain';
import { crearAlmacenDB } from './esquema';
import { crearRepositorioDexie } from './repositorioDexie';

const CONSUMO: Record<string, number> = { te: 160, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5 };

const movimientos: MovimientoRegistro[] = [
  { id: 'a', timestamp: '2026-01-01T00:00:01.000Z', mov: { tipo: 'compra', insumoId: 'te', cantidad: 1000 } },
  { id: 'b', timestamp: '2026-01-01T00:00:02.000Z', mov: { tipo: 'produccion', lotes: 2, descuentos: { te: 320, azucar: 1600 } } },
  { id: 'c', timestamp: '2026-01-01T00:00:03.000Z', mov: { tipo: 'ajuste', insumoId: 'te', stockFisico: 650, descuadre: -30 } },
];

describe('upgrade de Dexie v1 -> v2', () => {
  it('migra insumos y productos sin tocar el log', async () => {
    const nombre = 'migracion-v1';
    const v1 = new Dexie(nombre);
    v1.version(1).stores({ insumos: 'id, activo', movimientos: 'id, timestamp', config: 'key' });
    await v1.table('insumos').bulkAdd(
      CATALOGO_SEMILLA.filter((i) => i.id !== 'stevia').map((i) => ({ ...i, consumoPorLote: CONSUMO[i.id] })),
    );
    await v1.table('movimientos').bulkAdd(movimientos);
    await v1.table('config').put({ key: 'capacidadObjetivo', value: 6 });
    v1.close();

    const db = crearAlmacenDB(nombre);
    const datos = await crearRepositorioDexie(db).leerTodo();

    expect(datos.productos.map((p) => p.id).sort()).toEqual(['morena', 'stevia']);
    expect(datos.productos.find((p) => p.id === 'morena')?.receta.te).toBe(160);
    expect(datos.insumos).toHaveLength(7);
    expect(datos.insumos.some((i) => 'consumoPorLote' in i)).toBe(false);
    expect([...datos.movimientos].sort((x, y) => x.id.localeCompare(y.id))).toEqual(movimientos);
    expect(calcularStocks(datos.movimientos).te).toBe(1000 - 320 - 30);
    db.close();
  });
});
