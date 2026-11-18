import { CATALOGO_SEMILLA, ETIQUETAS_PRODUCTO, PRODUCTOS_SEMILLA } from './seed';
import type { Insumo, MovimientoRegistro, Producto } from './types';

const IDS_ETIQUETA = Object.values(ETIQUETAS_PRODUCTO).map((e) => e.id);

/** Catalogo de antes de las etiquetas (v3): copias de la semilla sin los insumos de etiqueta. */
export function catalogoSinEtiquetas(): Insumo[] {
  return CATALOGO_SEMILLA.filter((i) => !IDS_ETIQUETA.includes(i.id)).map((i) => ({ ...i }));
}

/** Productos de antes de las etiquetas: copias con recetas nuevas, sin las claves de etiqueta. */
export function productosSinEtiquetas(): Producto[] {
  return PRODUCTOS_SEMILLA.map((p) => ({
    ...p,
    receta: Object.fromEntries(Object.entries(p.receta).filter(([id]) => !IDS_ETIQUETA.includes(id))),
  }));
}

let contador = 0;
/** Crea un registro con timestamp creciente para forzar orden cronologico. */
export function reg(mov: MovimientoRegistro['mov']): MovimientoRegistro {
  contador += 1;
  const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, contador)).toISOString();
  return { id: `m${contador}`, timestamp: ts, mov };
}

/** Ajuste de carga inicial: sobre stock cero, descuadre = fisico. */
export function conteo(insumoId: string, fisico: number): MovimientoRegistro {
  return reg({ tipo: 'ajuste', insumoId, stockFisico: fisico, descuadre: fisico });
}
