/** Catalogo: configuracion editable. NO es un evento. */
export interface Insumo {
  id: string; // 'te' | 'azucar' | 'stevia' | 'limon' | 'pet' | 'tapa' | 'agua' | 'hielo'
  nombre: string;
  unidadBase: string; // unidad en que se mide el stock: 'g' | 'ml' | 'pza' | 'L' | 'charolas'
  // Presentacion de compra (en que unidades se compra):
  presentacionNombre: string; // p.ej. "bolsa 1kg", "garrafon 20L"
  presentacionCantidad: number; // cuantas unidadBase trae una presentacion
  presentacionPrecio: number; // MXN, precio vigente editable
  umbralLotes: number; // default 2
  activo: boolean;
  // No se compra: se prepara en casa (el hielo). Solo importa si hay o no;
  // no lleva precio, no entra a la sugerencia de compra ni a las recetas.
  hechoEnCasa?: boolean;
}
