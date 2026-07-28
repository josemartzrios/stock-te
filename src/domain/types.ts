// ===================================================================
// Modelo de datos. Sin dependencias de UI ni de persistencia.
// ===================================================================

/** Catalogo: configuracion editable. NO es un evento. */
export interface Insumo {
  id: string; // 'te' | 'azucar' | 'limon' | 'pet' | 'tapa' | 'agua'
  nombre: string;
  unidadBase: string; // unidad en que se mide el stock: 'g' | 'pza' | 'L'
  consumoPorLote: number; // en unidadBase
  // Presentacion de compra (en que unidades se compra):
  presentacionNombre: string; // p.ej. "bolsa 1kg", "garrafon 20L"
  presentacionCantidad: number; // cuantas unidadBase trae una presentacion
  presentacionPrecio: number; // MXN, precio vigente editable
  umbralLotes: number; // default 2
  activo: boolean;
}

// Event log -- INMUTABLE. Nunca update, nunca delete.
export type Movimiento =
  | { tipo: 'compra'; insumoId: string; cantidad: number; costoTotal?: number }
  | { tipo: 'produccion'; lotes: number; descuentos: Record<string, number> }
  // descuentos = snapshot de {insumoId: cantidad descontada} calculado con la
  // receta VIGENTE al momento de guardar. La UI pide solo "cuantos lotes?";
  // el snapshot lo calcula el sistema. Asi la receta es editable sin que el
  // pasado se recalcule.
  | {
      tipo: 'ajuste';
      insumoId: string;
      stockFisico: number;
      descuadre: number;
      nota?: string;
    };

export interface MovimientoRegistro {
  id: string; // uuid
  timestamp: string; // ISO
  mov: Movimiento;
}

/** Configuracion global (no eventos). */
export interface ConfigGlobal {
  capacidadObjetivo: number; // lotes objetivo al sugerir compra (default 6)
}

// -------- Tipos derivados (solo lectura, calculados desde el log) --------

export type Color = 'rojo' | 'amarillo' | 'verde';

export interface EstadoInsumo {
  insumo: Insumo;
  stock: number; // en unidadBase (puede ser negativo)
  lotes: number; // lotes completos que alcanza (0 si negativo)
  negativo: boolean;
  color: Color;
  necesitaCompra: boolean; // lotes <= umbral
}

export interface EstadoGlobal {
  lotesGlobal: number; // minimo sobre insumos activos (el cuello de botella)
  cuelloBotella: Insumo | null; // insumo que marca el minimo
  insumos: EstadoInsumo[]; // ordenados igual que el catalogo activo
  hayQueComprar: boolean; // algun insumo amarillo/rojo
}

export interface LineaSugerencia {
  insumo: Insumo;
  stockActual: number;
  lotesActuales: number;
  faltante: number; // unidadBase que faltan para la capacidad objetivo
  presentaciones: number; // presentaciones completas a comprar (ceil)
  unidadesCompradas: number; // presentaciones * presentacionCantidad
  costoEstimado: number; // presentaciones * presentacionPrecio
}

export interface Sugerencia {
  lineas: LineaSugerencia[];
  costoTotal: number;
  capacidadObjetivo: number;
}
