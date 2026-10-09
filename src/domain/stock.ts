// ===================================================================
// Stock derivado del event log. Sin dependencias de UI ni de persistencia.
// ===================================================================

import type { MovimientoRegistro } from './types';

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
 * Usa SIEMPRE el snapshot `descuentos` del evento de produccion, nunca la
 * receta vigente. En un ajuste suma el `descuadre` guardado
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

/** Descuadre de un conteo fisico contra el teorico actual. */
export function calcularDescuadre(stockFisico: number, stockTeorico: number): number {
  return stockFisico - stockTeorico;
}
