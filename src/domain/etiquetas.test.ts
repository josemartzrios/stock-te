import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR, PRODUCTOS_SEMILLA } from './seed';
import { calcularEstadoInsumos, calcularEstadoProductos } from './estadoProducto';
import { calcularSugerencia } from './sugerencia';
import { armarProduccion } from './receta';
import { asegurarEtiquetas } from './migracion';
import { catalogoSinEtiquetas, productosSinEtiquetas } from './testHelpers';
import type { Insumo, Producto } from './types';

const [morena, stevia] = PRODUCTOS_SEMILLA;
const HOLGADO: Record<string, number> = {
  te: 10000, azucar: 10000, stevia: 10000, limon: 10000, pet: 10000, tapa: 10000, agua: 10000,
  'etiqueta-normal': 10000, 'etiqueta-sin-azucar': 10000,
};

describe('semilla de etiquetas', () => {
  it('son dos insumos en piezas: pedido de 100 pzas a $80, umbral 2', () => {
    const esperadas = [
      [ETIQUETA_NORMAL, 'etiqueta-normal', 'Etiqueta te normal'],
      [ETIQUETA_SIN_AZUCAR, 'etiqueta-sin-azucar', 'Etiqueta te sin azucar'],
    ] as const;
    for (const [etiqueta, id, nombre] of esperadas) {
      expect(etiqueta).toEqual({
        id, nombre, unidadBase: 'pza', presentacionNombre: 'pedido 100 pzas',
        presentacionCantidad: 100, presentacionPrecio: 80, umbralLotes: 2, activo: true,
      });
      expect(CATALOGO_SEMILLA).toContainEqual(etiqueta);
    }
  });

  it('cada receta lleva solo la etiqueta de su producto, 18 por lote', () => {
    expect(morena.receta['etiqueta-normal']).toBe(18);
    expect(morena.receta['etiqueta-sin-azucar']).toBeUndefined();
    expect(stevia.receta['etiqueta-sin-azucar']).toBe(18);
    expect(stevia.receta['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en los lotes', () => {
  const estado = (stocks: Record<string, number>) =>
    calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, ...stocks });

  it('con 36 etiquetas morena alcanza 2 lotes y la etiqueta es su cuello de botella', () => {
    const [m, s] = estado({ 'etiqueta-normal': 36 });
    expect(m.lotes).toBe(2);
    expect(m.cuelloBotella?.id).toBe('etiqueta-normal');
    // stevia no depende de la etiqueta normal: sus lotes no cambian con ella
    expect(s.lotes).toBe(estado({ 'etiqueta-normal': 0 })[1].lotes);
  });

  it('con 17 etiquetas no alcanza ni para un lote: 0 lotes y rojo', () => {
    const [m] = estado({ 'etiqueta-normal': 17 });
    expect(m.lotes).toBe(0);
    expect(m.color).toBe('rojo');
  });

  it('stock negativo de etiquetas: 0 lotes, linea negativa y rojo, sin lanzar', () => {
    const [m] = estado({ 'etiqueta-normal': -5 });
    expect(m.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({ lotes: 0, negativo: true, color: 'rojo' });
    expect(m.lotes).toBe(0);
  });

  it('en la lista de insumos: 36 piezas son 2 lotes, amarillo y piden compra', () => {
    const e = calcularEstadoInsumos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, 'etiqueta-normal': 36 })
      .find((x) => x.insumo.id === 'etiqueta-normal')!;
    expect(e).toMatchObject({ lotes: 2, color: 'amarillo', necesitaCompra: true });
  });
});

describe('producir descuenta etiquetas', () => {
  it('1 lote de stevia descuenta 18 de la etiqueta sin azucar y ninguna de la normal', () => {
    const d = armarProduccion(stevia, CATALOGO_SEMILLA, 1).descuentos;
    expect(d['etiqueta-sin-azucar']).toBe(18);
    expect(d['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en Que comprar', () => {
  const sug = (stocks: Record<string, number>, productos = PRODUCTOS_SEMILLA) =>
    calcularSugerencia(CATALOGO_SEMILLA, productos, { ...HOLGADO, ...stocks });

  it('sin etiquetas entra sola: faltante 54, 1 pedido de 100, $80', () => {
    const s = sug({ 'etiqueta-normal': 0 });
    expect(s.lineas.map((l) => l.insumo.id)).toEqual(['etiqueta-normal']);
    expect(s.lineas[0]).toMatchObject({ faltante: 54, presentaciones: 1, unidadesCompradas: 100, costoEstimado: 80 });
  });

  it('con 53 etiquetas (2 lotes, en el umbral) entra: faltante 1, 1 pedido', () => {
    const s = sug({ 'etiqueta-normal': 53 });
    expect(s.lineas[0]).toMatchObject({ insumo: ETIQUETA_NORMAL, lotesActuales: 2, faltante: 1, presentaciones: 1 });
  });

  it('con 54 etiquetas (3 lotes, sobre el umbral) ya no aparece', () => {
    expect(sug({ 'etiqueta-normal': 54 }).lineas).toHaveLength(0);
  });

  it('redondea a pedidos completos: objetivo 6 lotes => 108 pzas => 2 pedidos, $160', () => {
    const s = sug({ 'etiqueta-normal': 0 }, [{ ...morena, objetivoLotes: 6 }, stevia]);
    expect(s.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({
      faltante: 108, presentaciones: 2, costoEstimado: 160,
    });
  });
});

// Congela en profundidad: si la funcion muta una entrada, la prueba lanza TypeError.
const congelar = <T>(x: T): T => {
  if (x && typeof x === 'object') {
    Object.values(x).forEach(congelar);
    Object.freeze(x);
  }
  return x;
};

describe('asegurarEtiquetas', () => {
  const cat = catalogoSinEtiquetas;
  const prods = productosSinEtiquetas;

  it('agrega las dos etiquetas al final, cada una en la receta de su producto, sin mutar las entradas', () => {
    const entrada = congelar(cat());
    const r = asegurarEtiquetas(entrada, congelar(prods()));
    expect(r.insumos.slice(0, entrada.length)).toEqual(entrada);
    expect(r.insumos.slice(-2)).toEqual([ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR]);
    expect(r.productos.map((p) => p.receta)).toEqual(PRODUCTOS_SEMILLA.map((p) => p.receta));
  });

  it('respeta una receta editada (te 160) y una etiqueta ya puesta en 20 por lote', () => {
    const [m, s] = prods();
    const editado = { ...m, receta: { ...m.receta, te: 160, 'etiqueta-normal': 20 } };
    const r = asegurarEtiquetas(cat(), [editado, s]);
    expect(r.productos[0].receta).toMatchObject({ te: 160, 'etiqueta-normal': 20 });
    expect(r.productos[1].receta['etiqueta-sin-azucar']).toBe(18);
  });

  it('respeta una etiqueta puesta en 0 en la receta (el usuario la desactivo)', () => {
    const [m, s] = prods();
    const r = asegurarEtiquetas(cat(), [{ ...m, receta: { ...m.receta, 'etiqueta-normal': 0 } }, s]);
    expect(r.productos[0].receta['etiqueta-normal']).toBe(0);
  });

  it('no pisa una etiqueta existente (editada o desactivada) ni la vuelve a poner en la receta', () => {
    const editada = { ...ETIQUETA_NORMAL, presentacionPrecio: 95, activo: false };
    const r = asegurarEtiquetas([...cat(), editada], prods());
    expect(r.insumos.filter((i) => i.id === 'etiqueta-normal')).toEqual([editada]);
    expect(r.productos[0].receta['etiqueta-normal']).toBeUndefined();
    expect(r.insumos.filter((i) => i.id === 'etiqueta-sin-azucar')).toHaveLength(1);
    expect(r.productos[1].receta['etiqueta-sin-azucar']).toBe(18);
  });

  it('un catalogo vacio se deja vacio aunque haya productos (lo siembra la inicializacion)', () => {
    const productos = prods();
    const r = asegurarEtiquetas([], productos);
    expect(r.insumos).toEqual([]);
    expect(r.productos).toEqual(productos);
  });

  it('es idempotente: aplicarlo dos veces no duplica nada', () => {
    const una = asegurarEtiquetas(cat(), prods());
    expect(asegurarEtiquetas(una.insumos, una.productos)).toEqual(una);
  });

  it.each(['otro', 'constructor', 'toString', '__proto__', 'valueOf'])(
    'ignora un producto con id %s y solo agrega los 2 insumos',
    (id) => {
      const p = { id, nombre: 'x', receta: { te: 100 }, objetivoLotes: 3, activo: true };
      const r = asegurarEtiquetas(cat(), [p]);
      expect(r.productos).toEqual([p]);
      expect(r.insumos).toHaveLength(cat().length + 2);
    },
  );

  it.each([['sin receta', undefined], ['receta null', null], ['receta texto', 'x'], ['receta arreglo', []]])(
    '%s: no lanza y deja el producto como esta',
    (_nombre, receta) => {
      const raro = { id: 'morena', nombre: 'x', receta, objetivoLotes: 3, activo: false } as unknown as Producto;
      expect(() => asegurarEtiquetas(cat(), [raro])).not.toThrow();
      expect(asegurarEtiquetas(cat(), [raro]).productos).toEqual([raro]);
    },
  );

  it('no lanza con elementos nulos en el catalogo o en los productos', () => {
    const nulo = null as unknown as Insumo;
    expect(() => asegurarEtiquetas([nulo, ...cat()], [null as unknown as Producto, ...prods()])).not.toThrow();
  });
});
