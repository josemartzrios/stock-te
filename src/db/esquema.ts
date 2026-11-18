import Dexie, { type Table } from 'dexie';
import { asegurarEtiquetas, asegurarInsumosCasa, migrarInsumosV1, type InsumoV1 } from '../domain/migracion';
import type { Insumo, MovimientoRegistro, Producto } from '../domain';

export class AlmacenDB extends Dexie {
  insumos!: Table<Insumo, string>;
  productos!: Table<Producto, string>;
  movimientos!: Table<MovimientoRegistro, string>;

  constructor(nombre: string) {
    super(nombre);
    // v1: un solo producto; la receta vivia en cada insumo (`consumoPorLote`).
    this.version(1).stores({
      insumos: 'id, activo',
      movimientos: 'id, timestamp',
      config: 'key',
    });
    // v2: productos con receta propia. `config` (capacidadObjetivo) desaparece:
    // cada producto trae su `objetivoLotes`. El log de movimientos no se toca.
    this.version(2)
      .stores({ productos: 'id, activo', config: null })
      .upgrade(async (tx) => {
        const v1 = await tx.table<InsumoV1, string>('insumos').toArray();
        const { insumos, productos } = migrarInsumosV1(v1);
        await tx.table('insumos').clear();
        await tx.table('insumos').bulkAdd(insumos);
        await tx.table('productos').bulkAdd(productos);
      });
    // v3: insumos hechos en casa (el hielo). Solo agrega lo que falta; nada mas cambia.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const tabla = tx.table<Insumo, string>('insumos');
        const actuales = await tabla.toArray();
        const nuevos = asegurarInsumosCasa(actuales).slice(actuales.length);
        if (nuevos.length) await tabla.bulkAdd(nuevos);
      });
    // v4: etiquetas por producto. Solo agrega lo que falta; nada mas cambia.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        const tablaInsumos = tx.table<Insumo, string>('insumos');
        const tablaProductos = tx.table<Producto, string>('productos');
        const insumos = await tablaInsumos.toArray();
        const resultado = asegurarEtiquetas(insumos, await tablaProductos.toArray());
        const nuevos = resultado.insumos.slice(insumos.length);
        if (nuevos.length === 0) return;
        await tablaInsumos.bulkAdd(nuevos);
        await tablaProductos.bulkPut(resultado.productos);
      });
  }
}

export function crearAlmacenDB(nombre = 'almacen-te'): AlmacenDB {
  return new AlmacenDB(nombre);
}
