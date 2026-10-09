import { migrarInsumosV1, type InsumoV1 } from './migracion';
import type { Datos, Insumo, MovimientoRegistro, Producto } from './types';

export interface Respaldo {
  formato: 'almacen-te';
  version: 2;
  exportado: string;
  insumos: Insumo[];
  productos: Producto[];
  movimientos: MovimientoRegistro[];
}

const ERROR_INVALIDO = 'El archivo no es un respaldo valido de Almacen Te.';

export function crearRespaldo(datos: Datos, ahora: Date = new Date()): Respaldo {
  return {
    formato: 'almacen-te',
    version: 2,
    exportado: ahora.toISOString(),
    insumos: datos.insumos,
    productos: datos.productos,
    movimientos: datos.movimientos,
  };
}

/** Acepta respaldos v1 (los migra) y v2. Lanza un error legible si no es valido. */
export function parsearRespaldo(data: unknown): Datos {
  const r = data as Partial<Respaldo> & { version?: number } | null;
  if (!r || r.formato !== 'almacen-te' || !Array.isArray(r.insumos) || !Array.isArray(r.movimientos)) {
    throw new Error(ERROR_INVALIDO);
  }
  if (r.version === 1) {
    const { insumos, productos } = migrarInsumosV1(r.insumos as InsumoV1[]);
    return { insumos, productos, movimientos: r.movimientos };
  }
  if (r.version === 2 && Array.isArray(r.productos)) {
    return { insumos: r.insumos, productos: r.productos, movimientos: r.movimientos };
  }
  throw new Error(ERROR_INVALIDO);
}
