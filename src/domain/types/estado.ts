import type { Insumo } from './insumo';
import type { Producto } from './producto';

// -------- Tipos derivados (solo lectura, calculados desde el log) --------

export type Color = 'rojo' | 'amarillo' | 'verde';

/** Un insumo visto desde la receta de un producto. */
export interface EstadoInsumoProducto {
  insumo: Insumo;
  stock: number; // en unidadBase (puede ser negativo)
  lotes: number; // lotes completos de ESTE producto que alcanza (0 si negativo)
  negativo: boolean;
  color: Color;
}

export interface EstadoProducto {
  producto: Producto;
  lotes: number; // minimo sobre su receta (el cuello de botella)
  cuelloBotella: Insumo | null;
  lineas: EstadoInsumoProducto[];
  color: Color; // el peor color de sus lineas
  hayQueComprar: boolean; // alguna linea con lotes <= umbral
}

/** Un insumo visto en el inventario, con el peor caso entre productos. */
export interface EstadoInsumo {
  insumo: Insumo;
  stock: number;
  lotes: number | null; // null si ningun producto activo lo usa
  negativo: boolean;
  color: Color;
  necesitaCompra: boolean;
}

export interface LineaSugerencia {
  insumo: Insumo;
  stockActual: number;
  lotesActuales: number;
  faltante: number; // unidadBase que faltan para cubrir los objetivos
  presentaciones: number; // presentaciones completas a comprar (ceil)
  unidadesCompradas: number; // presentaciones * presentacionCantidad
  costoEstimado: number; // presentaciones * presentacionPrecio
}

export interface Sugerencia {
  lineas: LineaSugerencia[];
  costoTotal: number;
  objetivos: { productoId: string; nombre: string; lotes: number }[];
}
