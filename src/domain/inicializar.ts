import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import type { AlmacenRepositorio } from './repositorio';

/**
 * Siembra catalogo y productos la primera vez. No crea movimientos: el primer
 * uso real es un conteo fisico. Si ya hay datos no toca nada.
 */
export async function inicializarAlmacen(repo: AlmacenRepositorio): Promise<void> {
  const { insumos } = await repo.leerTodo();
  if (insumos.length > 0) return;
  await repo.reemplazarTodo({ insumos: CATALOGO_SEMILLA, productos: PRODUCTOS_SEMILLA, movimientos: [] });
}
