/** Catalogo: configuracion editable. NO es un evento. */
export interface Insumo {
  id: string; // 'te' | 'azucar' | 'stevia' | 'limon' | 'pet' | 'tapa' | 'agua'
  nombre: string;
  unidadBase: string; // unidad en que se mide el stock: 'g' | 'ml' | 'pza' | 'L'
  // Presentacion de compra (en que unidades se compra):
  presentacionNombre: string; // p.ej. "bolsa 1kg", "garrafon 20L"
  presentacionCantidad: number; // cuantas unidadBase trae una presentacion
  presentacionPrecio: number; // MXN, precio vigente editable
  umbralLotes: number; // default 2
  activo: boolean;
}
