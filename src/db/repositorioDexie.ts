import type { AlmacenRepositorio } from '../domain/repositorio';
import { crearRegistro } from '../domain/registro';
import type { AlmacenDB } from './esquema';

export function crearRepositorioDexie(db: AlmacenDB): AlmacenRepositorio {
  return {
    async leerTodo() {
      const [insumos, productos, movimientos] = await Promise.all([
        db.insumos.toArray(),
        db.productos.toArray(),
        db.movimientos.toArray(),
      ]);
      return { insumos, productos, movimientos };
    },
    async agregarMovimiento(mov) {
      await db.movimientos.add(crearRegistro(mov));
    },
    async guardarInsumo(insumo) {
      await db.insumos.put(insumo);
    },
    async guardarProducto(producto) {
      await db.productos.put(producto);
    },
    async reemplazarTodo(datos) {
      await db.transaction('rw', db.insumos, db.productos, db.movimientos, async () => {
        await Promise.all([db.insumos.clear(), db.productos.clear(), db.movimientos.clear()]);
        await db.insumos.bulkAdd(datos.insumos);
        await db.productos.bulkAdd(datos.productos);
        await db.movimientos.bulkAdd(datos.movimientos);
      });
    },
  };
}
