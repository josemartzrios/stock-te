import { asegurarEtiquetas, asegurarInsumosCasa, migrarInsumosV1, type InsumoV1 } from './migracion';
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

/** Pone al dia un catalogo viejo: agrega el hielo y las etiquetas que falten. */
function completarCatalogo(insumos: Insumo[], productos: Producto[]): { insumos: Insumo[]; productos: Producto[] } {
  return asegurarEtiquetas(asegurarInsumosCasa(insumos), productos);
}

/** Acepta respaldos v1 (los migra) y v2; a ambos les agrega el hielo y las etiquetas si no las traen. Lanza un error legible si no es valido. */
export function parsearRespaldo(data: unknown): Datos {
  const r = data as {
    formato?: unknown;
    version?: unknown;
    insumos?: unknown;
    productos?: unknown;
    movimientos?: unknown;
  } | null;
  if (!r || r.formato !== 'almacen-te' || !Array.isArray(r.insumos) || !Array.isArray(r.movimientos)) {
    throw new Error(ERROR_INVALIDO);
  }
  if (r.version === 1) {
    const { insumos, productos } = migrarInsumosV1(r.insumos as InsumoV1[]);
    return { ...completarCatalogo(insumos, productos), movimientos: r.movimientos as MovimientoRegistro[] };
  }
  if (r.version === 2 && Array.isArray(r.productos)) {
    return {
      ...completarCatalogo(r.insumos as Insumo[], r.productos as Producto[]),
      movimientos: r.movimientos as MovimientoRegistro[],
    };
  }
  throw new Error(ERROR_INVALIDO);
}
