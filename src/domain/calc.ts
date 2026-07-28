// ===================================================================
// Corazon del sistema: reducer puro sobre el event log.
// Sin dependencias de UI ni de persistencia. Todo es derivado del log.
// ===================================================================

import type {
  Color,
  ConfigGlobal,
  EstadoGlobal,
  EstadoInsumo,
  Insumo,
  LineaSugerencia,
  MovimientoRegistro,
  Sugerencia,
} from './types';

/**
 * Ordena el log cronologicamente. Los ISO timestamps ordenan
 * lexicograficamente = cronologicamente. El sort de JS es estable, asi que
 * eventos con el mismo timestamp conservan su orden de insercion.
 */
export function ordenarLog(movimientos: MovimientoRegistro[]): MovimientoRegistro[] {
  return [...movimientos].sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
}

/**
 * Stock de todos los insumos derivado del log.
 *
 *   stock(insumo) = Sum compras + Sum ajustes(descuadre) - Sum producciones.descuentos[insumo]
 *
 * El reducer usa SIEMPRE el snapshot `descuentos` del evento de produccion,
 * nunca la receta vigente. En un ajuste se suma el `descuadre` guardado
 * (descuadre = fisico - teorico), de modo que el corriente queda == fisico.
 */
export function calcularStocks(movimientos: MovimientoRegistro[]): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const reg of ordenarLog(movimientos)) {
    const m = reg.mov;
    switch (m.tipo) {
      case 'compra':
        stock[m.insumoId] = (stock[m.insumoId] ?? 0) + m.cantidad;
        break;
      case 'produccion':
        for (const [id, qty] of Object.entries(m.descuentos)) {
          stock[id] = (stock[id] ?? 0) - qty;
        }
        break;
      case 'ajuste':
        stock[m.insumoId] = (stock[m.insumoId] ?? 0) + m.descuadre;
        break;
    }
  }
  return stock;
}

/** Stock de un solo insumo. */
export function stockDeInsumo(insumoId: string, movimientos: MovimientoRegistro[]): number {
  return calcularStocks(movimientos)[insumoId] ?? 0;
}

/**
 * Lotes completos que alcanza el stock actual.
 * Stock negativo => 0 lotes con bandera `negativo` (no truena, no bloquea).
 */
export function lotesRestantes(
  stock: number,
  consumoPorLote: number,
): { lotes: number; negativo: boolean } {
  const negativo = stock < 0;
  if (negativo) return { lotes: 0, negativo: true };
  if (consumoPorLote <= 0) return { lotes: 0, negativo: false };
  return { lotes: Math.floor(stock / consumoPorLote), negativo: false };
}

/**
 * Semaforo por insumo.
 *   rojo    = stock negativo o 0 lotes (no alcanza para producir)
 *   amarillo= lotes <= umbral (hay que comprar pronto)
 *   verde   = lotes > umbral
 *
 * Nota: el contrato menciona "rojo <= 1 lote"; el fixture de pruebas exige que
 * PET/tapa con 1 lote y umbral 2 salgan AMARILLO. Se respeta el fixture:
 * rojo solo cuando no alcanza ni para un lote (0 o negativo).
 */
export function colorSemaforo(lotes: number, negativo: boolean, umbralLotes: number): Color {
  if (negativo || lotes === 0) return 'rojo';
  if (lotes <= umbralLotes) return 'amarillo';
  return 'verde';
}

/** Snapshot de descuentos para una produccion, segun la receta VIGENTE. */
export function calcularDescuentos(insumos: Insumo[], lotes: number): Record<string, number> {
  const descuentos: Record<string, number> = {};
  for (const ins of insumos) {
    if (!ins.activo) continue;
    descuentos[ins.id] = ins.consumoPorLote * lotes;
  }
  return descuentos;
}

/** Descuadre de un conteo fisico contra el teorico actual. */
export function calcularDescuadre(stockFisico: number, stockTeorico: number): number {
  return stockFisico - stockTeorico;
}

/**
 * Estado completo derivado: por insumo + global (cuello de botella).
 * Solo considera insumos activos para el minimo global.
 */
export function calcularEstado(
  insumos: Insumo[],
  movimientos: MovimientoRegistro[],
): EstadoGlobal {
  const stocks = calcularStocks(movimientos);
  const activos = insumos.filter((i) => i.activo);

  const estados: EstadoInsumo[] = activos.map((insumo) => {
    const stock = stocks[insumo.id] ?? 0;
    const { lotes, negativo } = lotesRestantes(stock, insumo.consumoPorLote);
    const color = colorSemaforo(lotes, negativo, insumo.umbralLotes);
    return {
      insumo,
      stock,
      lotes,
      negativo,
      color,
      necesitaCompra: lotes <= insumo.umbralLotes,
    };
  });

  let lotesGlobal = Infinity;
  let cuelloBotella: Insumo | null = null;
  for (const e of estados) {
    if (e.lotes < lotesGlobal) {
      lotesGlobal = e.lotes;
      cuelloBotella = e.insumo;
    }
  }
  if (!Number.isFinite(lotesGlobal)) lotesGlobal = 0;

  return {
    lotesGlobal,
    cuelloBotella,
    insumos: estados,
    hayQueComprar: estados.some((e) => e.necesitaCompra),
  };
}

/**
 * Sugerencia de compra: para cada insumo bajo umbral, cuantas presentaciones
 * completas hacen falta para volver a la capacidad objetivo (en lotes).
 * Redondea SIEMPRE hacia arriba a presentaciones completas.
 */
export function calcularSugerencia(
  insumos: Insumo[],
  movimientos: MovimientoRegistro[],
  config: ConfigGlobal,
): Sugerencia {
  const stocks = calcularStocks(movimientos);
  const objetivo = config.capacidadObjetivo;
  const lineas: LineaSugerencia[] = [];

  for (const insumo of insumos) {
    if (!insumo.activo) continue;
    const stock = stocks[insumo.id] ?? 0;
    const { lotes } = lotesRestantes(stock, insumo.consumoPorLote);
    if (lotes > insumo.umbralLotes) continue; // no esta bajo umbral

    const stockObjetivo = objetivo * insumo.consumoPorLote;
    const faltante = stockObjetivo - stock;
    if (faltante <= 0) continue; // ya alcanza el objetivo

    const presentaciones =
      insumo.presentacionCantidad > 0
        ? Math.ceil(faltante / insumo.presentacionCantidad)
        : 0;

    lineas.push({
      insumo,
      stockActual: stock,
      lotesActuales: lotes,
      faltante,
      presentaciones,
      unidadesCompradas: presentaciones * insumo.presentacionCantidad,
      costoEstimado: presentaciones * insumo.presentacionPrecio,
    });
  }

  const costoTotal = lineas.reduce((sum, l) => sum + l.costoEstimado, 0);
  return { lineas, costoTotal, capacidadObjetivo: objetivo };
}
