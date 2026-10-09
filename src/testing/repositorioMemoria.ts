import { crearRegistro } from '../domain/registro';
import type { AlmacenRepositorio } from '../domain/repositorio';
import type { Datos } from '../domain/types';

const copia = <T>(x: T): T => structuredClone(x);
const upsert = <T extends { id: string }>(lista: T[], item: T): T[] =>
  lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];

/** Implementacion en memoria del repositorio, para pruebas. */
export function crearRepositorioMemoria(inicial?: Datos): AlmacenRepositorio {
  let datos: Datos = copia(inicial ?? { insumos: [], productos: [], movimientos: [] });
  return {
    async leerTodo() {
      return copia(datos);
    },
    async agregarMovimiento(mov) {
      datos = { ...datos, movimientos: [...datos.movimientos, crearRegistro(copia(mov))] };
    },
    async guardarInsumo(insumo) {
      datos = { ...datos, insumos: upsert(datos.insumos, copia(insumo)) };
    },
    async guardarProducto(producto) {
      datos = { ...datos, productos: upsert(datos.productos, copia(producto)) };
    },
    async reemplazarTodo(nuevos) {
      datos = copia(nuevos);
    },
  };
}
