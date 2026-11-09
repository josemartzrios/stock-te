import { describe, it, expect } from 'vitest';
import { crearRepositorioMemoria } from '../testing/repositorioMemoria';
import { inicializarAlmacen } from './inicializar';

describe('inicializarAlmacen', () => {
  it('repo vacio => 8 insumos, 2 productos, 0 movimientos', async () => {
    const repo = crearRepositorioMemoria();
    await inicializarAlmacen(repo);
    const d = await repo.leerTodo();
    expect(d.insumos).toHaveLength(8);
    expect(d.productos).toHaveLength(2);
    expect(d.movimientos).toHaveLength(0);
  });

  it('segunda llamada no duplica ni pisa un insumo editado', async () => {
    const repo = crearRepositorioMemoria();
    await inicializarAlmacen(repo);
    const { insumos } = await repo.leerTodo();
    await repo.guardarInsumo({ ...insumos[0], presentacionPrecio: 999 });
    await inicializarAlmacen(repo);
    const d = await repo.leerTodo();
    expect(d.insumos).toHaveLength(8);
    expect(d.insumos[0].presentacionPrecio).toBe(999);
  });
});

describe('inicializarAlmacen: no destruye el historial', () => {
  it('con movimientos pero sin insumos siembra el catalogo y conserva el log', async () => {
    const movimiento = { id: 'x', timestamp: '2026-01-01T00:00:00.000Z', mov: { tipo: 'compra' as const, insumoId: 'te', cantidad: 500 } };
    const repo = crearRepositorioMemoria({ insumos: [], productos: [], movimientos: [movimiento] });
    await inicializarAlmacen(repo);
    const d = await repo.leerTodo();
    expect(d.movimientos).toEqual([movimiento]);
    expect(d.insumos).toHaveLength(8);
    expect(d.productos).toHaveLength(2);
  });
});
