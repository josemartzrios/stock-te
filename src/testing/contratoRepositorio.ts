import { describe, expect, it } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from '../domain/seed';
import type { AlmacenRepositorio } from '../domain/repositorio';

/** Suite que toda implementacion de AlmacenRepositorio debe cumplir. */
export function ejecutarContrato(nombre: string, crear: () => Promise<AlmacenRepositorio>): void {
  describe(`contrato de repositorio: ${nombre}`, () => {
    it('vacio => tres arreglos vacios', async () => {
      const repo = await crear();
      expect(await repo.leerTodo()).toEqual({ insumos: [], productos: [], movimientos: [] });
    });

    it('guardarInsumo crea y luego actualiza el mismo id sin duplicar', async () => {
      const repo = await crear();
      const te = CATALOGO_SEMILLA[0];
      await repo.guardarInsumo(te);
      await repo.guardarInsumo({ ...te, presentacionPrecio: 999 });
      const { insumos } = await repo.leerTodo();
      expect(insumos).toHaveLength(1);
      expect(insumos[0].presentacionPrecio).toBe(999);
    });

    it('guardarProducto crea y luego actualiza el mismo id sin duplicar', async () => {
      const repo = await crear();
      const stevia = PRODUCTOS_SEMILLA[1];
      await repo.guardarProducto(stevia);
      await repo.guardarProducto({ ...stevia, receta: { ...stevia.receta, agua: 9 } });
      const { productos } = await repo.leerTodo();
      expect(productos).toHaveLength(1);
      expect(productos[0].receta.agua).toBe(9);
    });

    it('agregarMovimiento agrega con id y timestamp sin alterar los previos', async () => {
      const repo = await crear();
      await repo.agregarMovimiento({ tipo: 'compra', insumoId: 'te', cantidad: 1000 });
      const [primero] = (await repo.leerTodo()).movimientos;
      await repo.agregarMovimiento({ tipo: 'produccion', productoId: 'stevia', lotes: 1, descuentos: { te: 150 } });
      const { movimientos } = await repo.leerTodo();
      expect(movimientos).toHaveLength(2);
      expect(movimientos).toContainEqual(primero);
      expect(primero.id).toBeTruthy();
      expect(Number.isNaN(Date.parse(primero.timestamp))).toBe(false);
    });

    it('reemplazarTodo borra lo anterior y deja exactamente los datos dados', async () => {
      const repo = await crear();
      await repo.guardarInsumo(CATALOGO_SEMILLA[0]);
      await repo.agregarMovimiento({ tipo: 'compra', insumoId: 'te', cantidad: 1 });
      const nuevos = { insumos: [CATALOGO_SEMILLA[1]], productos: [PRODUCTOS_SEMILLA[0]], movimientos: [] };
      await repo.reemplazarTodo(nuevos);
      expect(await repo.leerTodo()).toEqual(nuevos);
    });
  });
}
