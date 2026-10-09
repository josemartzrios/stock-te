import { ordenarLog } from './stock';
import type { Insumo, Movimiento, MovimientoRegistro, Producto } from './types';

type Produccion = Extract<Movimiento, { tipo: 'produccion' }>;

/** Los eventos de produccion anteriores a los productos eran de azucar morena. */
export const ID_PRODUCTO_LEGADO = 'morena';

export function productoIdDeProduccion(mov: { productoId?: string }): string {
  return mov.productoId ?? ID_PRODUCTO_LEGADO;
}

/**
 * Snapshot de descuentos de una produccion segun la receta VIGENTE del
 * producto. Solo cuenta insumos que existen y estan activos en el catalogo.
 */
export function calcularDescuentos(
  producto: Producto,
  insumos: Insumo[],
  lotes: number,
): Record<string, number> {
  const activos = new Set(insumos.filter((i) => i.activo).map((i) => i.id));
  const descuentos: Record<string, number> = {};
  for (const [insumoId, porLote] of Object.entries(producto.receta)) {
    if (porLote > 0 && activos.has(insumoId)) descuentos[insumoId] = porLote * lotes;
  }
  return descuentos;
}

/** Arma el evento de produccion listo para guardar en el log. */
export function armarProduccion(producto: Producto, insumos: Insumo[], lotes: number): Produccion {
  return {
    tipo: 'produccion',
    productoId: producto.id,
    lotes,
    descuentos: calcularDescuentos(producto, insumos, lotes),
  };
}

/** Lotes de la ultima produccion de un producto; `defecto` si nunca se produjo. */
export function ultimosLotes(movimientos: MovimientoRegistro[], productoId: string, defecto = 2): number {
  const orden = ordenarLog(movimientos);
  for (let i = orden.length - 1; i >= 0; i--) {
    const m = orden[i].mov;
    if (m.tipo === 'produccion' && productoIdDeProduccion(m) === productoId) return m.lotes;
  }
  return defecto;
}
