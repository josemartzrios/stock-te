import Dexie, { type Table } from 'dexie';
import type { ConfigGlobal, Insumo, MovimientoRegistro } from '../domain';
import { CATALOGO_SEMILLA, CONFIG_SEMILLA } from '../domain';

// Registro key-value para configuracion global (una fila por clave).
interface ConfigRow {
  key: string;
  value: unknown;
}

export class AlmacenDB extends Dexie {
  insumos!: Table<Insumo, string>;
  movimientos!: Table<MovimientoRegistro, string>;
  config!: Table<ConfigRow, string>;

  constructor() {
    super('almacen-te');
    this.version(1).stores({
      // solo indexamos lo necesario para consultar/ordenar
      insumos: 'id, activo',
      movimientos: 'id, timestamp',
      config: 'key',
    });
  }
}

export const db = new AlmacenDB();

/** Siembra el catalogo y la config la primera vez. No crea movimientos. */
export async function inicializar(): Promise<void> {
  const count = await db.insumos.count();
  if (count === 0) {
    await db.insumos.bulkAdd(CATALOGO_SEMILLA);
  }
  const cap = await db.config.get('capacidadObjetivo');
  if (!cap) {
    await db.config.put({ key: 'capacidadObjetivo', value: CONFIG_SEMILLA.capacidadObjetivo });
  }
}

// -------- Lecturas --------

export async function leerTodo(): Promise<{
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  config: ConfigGlobal;
}> {
  const [insumos, movimientos, capRow] = await Promise.all([
    db.insumos.toArray(),
    db.movimientos.toArray(),
    db.config.get('capacidadObjetivo'),
  ]);
  const capacidadObjetivo =
    typeof capRow?.value === 'number' ? capRow.value : CONFIG_SEMILLA.capacidadObjetivo;
  return { insumos, movimientos, config: { capacidadObjetivo } };
}

// -------- Escrituras del event log (append-only) --------

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function agregarMovimiento(mov: MovimientoRegistro['mov']): Promise<void> {
  const registro: MovimientoRegistro = {
    id: nuevoId(),
    timestamp: new Date().toISOString(),
    mov,
  };
  await db.movimientos.add(registro);
}

// -------- Escrituras de configuracion (catalogo / globals) --------

export async function guardarInsumo(insumo: Insumo): Promise<void> {
  await db.insumos.put(insumo);
}

export async function guardarCapacidadObjetivo(valor: number): Promise<void> {
  await db.config.put({ key: 'capacidadObjetivo', value: valor });
}

// -------- Respaldo (export / import) --------

export interface Respaldo {
  formato: 'almacen-te';
  version: 1;
  exportado: string;
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  config: ConfigGlobal;
}

export async function exportarJSON(): Promise<Respaldo> {
  const { insumos, movimientos, config } = await leerTodo();
  return {
    formato: 'almacen-te',
    version: 1,
    exportado: new Date().toISOString(),
    insumos,
    movimientos,
    config,
  };
}

/** Reemplaza TODOS los datos con los del respaldo. Operacion destructiva. */
export async function importarJSON(data: unknown): Promise<void> {
  const r = data as Partial<Respaldo>;
  if (!r || r.formato !== 'almacen-te' || !Array.isArray(r.insumos) || !Array.isArray(r.movimientos)) {
    throw new Error('El archivo no es un respaldo valido de Almacen Te.');
  }
  await db.transaction('rw', db.insumos, db.movimientos, db.config, async () => {
    await Promise.all([db.insumos.clear(), db.movimientos.clear(), db.config.clear()]);
    await db.insumos.bulkAdd(r.insumos as Insumo[]);
    await db.movimientos.bulkAdd(r.movimientos as MovimientoRegistro[]);
    const cap = r.config?.capacidadObjetivo ?? CONFIG_SEMILLA.capacidadObjetivo;
    await db.config.put({ key: 'capacidadObjetivo', value: cap });
  });
}
