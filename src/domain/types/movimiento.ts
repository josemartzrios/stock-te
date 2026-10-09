// Event log -- INMUTABLE. Nunca update, nunca delete.
export type Movimiento =
  | {
      tipo: 'compra';
      insumoId: string;
      cantidad: number; // total en unidadBase (lo unico que mueve el stock)
      costoTotal?: number;
      // Snapshot de COMO se compro: cuantas presentaciones y de que tamano.
      // Puede no coincidir con el catalogo (promocion, otro empaque). Es
      // informativo: el stock siempre sale de `cantidad`.
      presentaciones?: number;
      presentacionCantidad?: number; // unidadBase que trajo cada presentacion
    }
  | {
      tipo: 'produccion';
      // Ausente en eventos anteriores a los productos: se lee como 'morena'.
      productoId?: string;
      lotes: number;
      // Snapshot {insumoId: cantidad descontada} calculado con la receta
      // VIGENTE al guardar. Asi la receta es editable sin recalcular el pasado.
      descuentos: Record<string, number>;
    }
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
