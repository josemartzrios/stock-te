// Migracion del modelo v1 (un solo producto, receta en cada insumo) al v2
// (productos con receta). Pura: la usan Dexie al actualizar y la importacion
// de respaldos viejos. El log de movimientos nunca se toca.

import { CATALOGO_SEMILLA, ETIQUETA_POR_LOTE, ETIQUETAS_PRODUCTO, HIELO, PRODUCTOS_SEMILLA } from './seed';
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

/**
 * v3: agrega los insumos hechos en casa (el hielo) a un catalogo que no los
 * trae. No pisa uno existente aunque este editado o desactivado. Un catalogo
 * vacio se deja asi: lo siembra la inicializacion completa.
 */
export function asegurarInsumosCasa(insumos: Insumo[]): Insumo[] {
  if (insumos.length === 0 || insumos.some((i) => i.id === HIELO.id)) return insumos;
  return [...insumos, HIELO];
}

const esRecetaValida = (receta: unknown): receta is Record<string, number> =>
  typeof receta === 'object' && receta !== null && !Array.isArray(receta);

const tieneClave = (objeto: object, clave: string) => Object.prototype.hasOwnProperty.call(objeto, clave);

/**
 * v4: agrega al catalogo las etiquetas que falten y, solo a las que se agregan
 * en esta pasada, su linea en la receta del producto: asi una etiqueta que el
 * usuario quito a proposito no reaparece al importar un respaldo. Un catalogo
 * vacio se deja vacio. No muta las entradas ni lanza con datos malformados.
 */
export function asegurarEtiquetas(
  insumos: Insumo[],
  productos: Producto[],
): { insumos: Insumo[]; productos: Producto[] } {
  if (insumos.length === 0) return { insumos, productos };

  const nuevos: Insumo[] = [];
  let resultado = productos;
  for (const [productoId, etiqueta] of Object.entries(ETIQUETAS_PRODUCTO)) {
    if (insumos.some((i) => i?.id === etiqueta.id)) continue;
    nuevos.push(etiqueta);
    resultado = resultado.map((p) =>
      p?.id === productoId && esRecetaValida(p.receta) && !tieneClave(p.receta, etiqueta.id)
        ? { ...p, receta: { ...p.receta, [etiqueta.id]: ETIQUETA_POR_LOTE } }
        : p,
    );
  }
  return { insumos: [...insumos, ...nuevos], productos: resultado };
}
