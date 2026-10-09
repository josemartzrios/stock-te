// Estado derivado por producto e insumo. Cada producto se evalua contra el
// MISMO stock: "con lo que hay, podrias hacer N solo de este".

import type { Color, EstadoInsumo, EstadoInsumoProducto, EstadoProducto, Insumo, Producto } from './types';

type Stocks = Record<string, number>;

const GRAVEDAD: Record<Color, number> = { verde: 0, amarillo: 1, rojo: 2 };

/**
 * Lotes completos que alcanza el stock. Stock negativo => 0 con bandera
 * `negativo` (no truena, no bloquea). Un consumo <= 0 no limita (Infinity).
 */
export function lotesRestantes(stock: number, porLote: number): { lotes: number; negativo: boolean } {
  if (stock < 0) return { lotes: 0, negativo: true };
  if (porLote <= 0) return { lotes: Infinity, negativo: false };
  return { lotes: Math.floor(stock / porLote), negativo: false };
}

/**
 * Semaforo por insumo.
 *   rojo     = stock negativo o 0 lotes (no alcanza ni para uno)
 *   amarillo = lotes <= umbral (hay que comprar pronto)
 *   verde    = lotes > umbral
 */
export function colorSemaforo(lotes: number, negativo: boolean, umbralLotes: number): Color {
  if (negativo || lotes === 0) return 'rojo';
  if (lotes <= umbralLotes) return 'amarillo';
  return 'verde';
}

function peorColor(colores: Color[]): Color {
  return colores.reduce<Color>((peor, c) => (GRAVEDAD[c] > GRAVEDAD[peor] ? c : peor), 'verde');
}

function estadoProducto(insumos: Insumo[], producto: Producto, stocks: Stocks): EstadoProducto {
  const lineas: EstadoInsumoProducto[] = insumos
    .filter((i) => i.activo && i.id in producto.receta)
    .map((insumo) => {
      const stock = stocks[insumo.id] ?? 0;
      const { lotes, negativo } = lotesRestantes(stock, producto.receta[insumo.id]);
      return { insumo, stock, lotes, negativo, color: colorSemaforo(lotes, negativo, insumo.umbralLotes) };
    });

  const limitantes = lineas.filter((l) => Number.isFinite(l.lotes));
  const cuello = limitantes.reduce<EstadoInsumoProducto | null>(
    (min, l) => (min === null || l.lotes < min.lotes ? l : min),
    null,
  );
  const lotes = cuello?.lotes ?? 0;

  return {
    producto,
    lotes,
    cuelloBotella: cuello?.insumo ?? null,
    lineas,
    color: lotes === 0 ? 'rojo' : peorColor(lineas.map((l) => l.color)),
    hayQueComprar: limitantes.some((l) => l.lotes <= l.insumo.umbralLotes),
  };
}

/** Un estado por producto activo, en el orden del arreglo `productos`. */
export function calcularEstadoProductos(
  insumos: Insumo[],
  productos: Producto[],
  stocks: Stocks,
): EstadoProducto[] {
  return productos.filter((p) => p.activo).map((p) => estadoProducto(insumos, p, stocks));
}

/** Un estado por insumo activo; `lotes` es el peor caso entre los productos que lo usan. */
export function calcularEstadoInsumos(
  insumos: Insumo[],
  productos: Producto[],
  stocks: Stocks,
): EstadoInsumo[] {
  const activos = productos.filter((p) => p.activo);
  return insumos
    .filter((i) => i.activo)
    .map((insumo) => {
      const stock = stocks[insumo.id] ?? 0;
      const negativo = stock < 0;
      const usos = activos
        .map((p) => p.receta[insumo.id])
        .filter((porLote): porLote is number => porLote !== undefined && porLote > 0);
      const lotes = usos.length ? Math.min(...usos.map((u) => lotesRestantes(stock, u).lotes)) : null;
      const color: Color =
        lotes === null ? (negativo ? 'rojo' : 'verde') : colorSemaforo(lotes, negativo, insumo.umbralLotes);
      return { insumo, stock, lotes, negativo, color, necesitaCompra: lotes !== null && lotes <= insumo.umbralLotes };
    });
}
