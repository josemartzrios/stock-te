import { describe, it, expect } from 'vitest';
import { crearRepositorioMemoria } from '../testing/repositorioMemoria';
import { inicializarAlmacen } from './inicializar';

describe('inicializarAlmacen', () => {
  it('repo vacio => 7 insumos, 2 productos, 0 movimientos', async () => {
    const repo = crearRepositorioMemoria();
    await inicializarAlmacen(repo);
    const d = await repo.leerTodo();
    expect(d.insumos).toHaveLength(7);
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
    expect(d.insumos).toHaveLength(7);
    expect(d.insumos[0].presentacionPrecio).toBe(999);
  });
});
