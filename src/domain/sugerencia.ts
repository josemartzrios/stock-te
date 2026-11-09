import { lotesRestantes } from './estadoProducto';
import type { Insumo, LineaSugerencia, Producto, Sugerencia } from './types';

/**
 * Sugerencia de compra para cubrir el objetivo de TODOS los productos activos
 * a la vez. Un insumo compartido suma el consumo de cada producto:
 *
 *   requerido(insumo) = Sum objetivoLotes(p) * receta(p)[insumo]
 *
 * Entra a la lista si, para algun producto que lo usa, su stock alcanza para
 * `umbralLotes` lotes o menos. Redondea SIEMPRE hacia arriba a presentaciones
 * completas.
 */
export function calcularSugerencia(
  insumos: Insumo[],
  productos: Producto[],
  stocks: Record<string, number>,
): Sugerencia {
  const activos = productos.filter((p) => p.activo);
  const lineas: LineaSugerencia[] = [];

  for (const insumo of insumos) {
    if (!insumo.activo || insumo.hechoEnCasa) continue; // el hielo no se compra
    const usos = activos
      .map((p) => ({ porLote: p.receta[insumo.id], objetivo: p.objetivoLotes }))
      .filter((u) => u.porLote !== undefined && u.porLote > 0);
    if (usos.length === 0) continue;

    const stock = stocks[insumo.id] ?? 0;
    const lotesActuales = Math.min(...usos.map((u) => lotesRestantes(stock, u.porLote).lotes));
    if (lotesActuales > insumo.umbralLotes) continue;

    const requerido = usos.reduce((suma, u) => suma + u.objetivo * u.porLote, 0);
    const faltante = requerido - stock;
    if (faltante <= 0) continue;

    const presentaciones =
      insumo.presentacionCantidad > 0 ? Math.ceil(faltante / insumo.presentacionCantidad) : 0;
    lineas.push({
      insumo,
      stockActual: stock,
      lotesActuales,
      faltante,
      presentaciones,
      unidadesCompradas: presentaciones * insumo.presentacionCantidad,
      costoEstimado: presentaciones * insumo.presentacionPrecio,
    });
  }

  return {
    lineas,
    costoTotal: lineas.reduce((suma, l) => suma + l.costoEstimado, 0),
    objetivos: activos.map((p) => ({ productoId: p.id, nombre: p.nombre, lotes: p.objetivoLotes })),
  };
}
