import type { Insumo } from './insumo';
import type { MovimientoRegistro } from './movimiento';
import type { Producto } from './producto';

/** Todo lo persistido: catalogo, productos y el log de movimientos. */
export interface Datos {
  insumos: Insumo[];
  productos: Producto[];
  movimientos: MovimientoRegistro[];
}
