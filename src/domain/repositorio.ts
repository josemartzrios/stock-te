import type { Datos, Insumo, Movimiento, Producto } from './types';

/**
 * Puerto de persistencia. El dominio y la UI dependen de esta interfaz;
 * Dexie la implementa en produccion y una version en memoria en las pruebas.
 */
export interface AlmacenRepositorio {
  leerTodo(): Promise<Datos>;
  /** Append-only: asigna id y timestamp. No existe update ni delete de movimientos. */
  agregarMovimiento(mov: Movimiento): Promise<void>;
  guardarInsumo(insumo: Insumo): Promise<void>;
  guardarProducto(producto: Producto): Promise<void>;
  /** Reemplaza TODO el contenido. Lo usan el arranque y la importacion de respaldos. */
  reemplazarTodo(datos: Datos): Promise<void>;
}
