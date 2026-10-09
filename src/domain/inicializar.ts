import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import type { AlmacenRepositorio } from './repositorio';

/**
 * Siembra catalogo y productos la primera vez. No crea movimientos: el primer
 * uso real es un conteo fisico. Si ya hay catalogo no toca nada. Nunca borra
 * el log, aunque llegue sin catalogo (p. ej. tras importar un respaldo parcial).
 */
export async function inicializarAlmacen(repo: AlmacenRepositorio): Promise<void> {
  const datos = await repo.leerTodo();
  if (datos.insumos.length > 0) return;
  await repo.reemplazarTodo({ ...datos, insumos: CATALOGO_SEMILLA, productos: PRODUCTOS_SEMILLA });
}
