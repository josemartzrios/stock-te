/** Producto que se fabrica. Su receta dice cuanto insumo consume un lote. */
export interface Producto {
  id: string; // 'morena' | 'stevia' | ...
  nombre: string;
  receta: Record<string, number>; // insumoId -> cantidad (unidadBase) por lote
  objetivoLotes: number; // lotes de este producto a cubrir al sugerir compra
  activo: boolean;
}
