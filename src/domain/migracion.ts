// Migracion del modelo v1 (un solo producto, receta en cada insumo) al v2
// (productos con receta). Pura: la usan Dexie al actualizar y la importacion
// de respaldos viejos. El log de movimientos nunca se toca.

import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import type { Insumo, Producto } from './types';

export type InsumoV1 = Insumo & { consumoPorLote: number };

const STEVIA_ML_POR_LOTE = 30;
const AGUA_STEVIA_L_POR_LOTE = 10;

export function migrarInsumosV1(v1: InsumoV1[]): { insumos: Insumo[]; productos: Producto[] } {
  const morenaReceta: Record<string, number> = {};
  const insumos: Insumo[] = v1.map(({ consumoPorLote, ...insumo }) => {
    if (consumoPorLote > 0) morenaReceta[insumo.id] = consumoPorLote;
    return insumo;
  });

  const { azucar: _azucar, ...base } = morenaReceta;
  const steviaReceta = { ...base, stevia: STEVIA_ML_POR_LOTE, agua: AGUA_STEVIA_L_POR_LOTE };

  const [morena, stevia] = PRODUCTOS_SEMILLA;
  const productos: Producto[] = [
    { ...morena, receta: morenaReceta },
    { ...stevia, receta: steviaReceta },
  ];

  if (!insumos.some((i) => i.id === 'stevia')) {
    insumos.push(CATALOGO_SEMILLA.find((i) => i.id === 'stevia')!);
  }
  return { insumos, productos };
}
