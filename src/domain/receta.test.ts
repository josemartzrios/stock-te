import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import { calcularStocks } from './stock';
import {
  armarProduccion,
  calcularDescuentos,
  ID_PRODUCTO_LEGADO,
  productoIdDeProduccion,
  ultimosLotes,
} from './receta';
import { reg, conteo } from './testHelpers';

const [morena, stevia] = PRODUCTOS_SEMILLA;

describe('calcularDescuentos', () => {
  it('morena 2 lotes descuenta su receta y no toca stevia', () => {
    expect(calcularDescuentos(morena, CATALOGO_SEMILLA, 2)).toEqual({
      te: 300, azucar: 1600, limon: 44, pet: 36, tapa: 36, agua: 19, 'etiqueta-normal': 36,
    });
  });

  it('stevia 2 lotes descuenta stevia y agua a 10 L, sin azucar', () => {
    const d = calcularDescuentos(stevia, CATALOGO_SEMILLA, 2);
    expect(d.stevia).toBe(60);
    expect(d.agua).toBe(20);
    expect(d.azucar).toBeUndefined();
  });

  it('ignora cantidades 0 o negativas en la receta', () => {
    const d = calcularDescuentos({ ...morena, receta: { te: 150, agua: 0, limon: -1 } }, CATALOGO_SEMILLA, 2);
    expect(d).toEqual({ te: 300 });
  });

  it('ignora insumos inactivos o inexistentes en el catalogo', () => {
    const insumos = CATALOGO_SEMILLA.map((i) => (i.id === 'limon' ? { ...i, activo: false } : i));
    const d = calcularDescuentos({ ...morena, receta: { ...morena.receta, fantasma: 5 } }, insumos, 1);
    expect(d.limon).toBeUndefined();
    expect(d.fantasma).toBeUndefined();
  });
});

describe('stock compartido entre productos', () => {
  it('producir morena y luego stevia deja el te en stock - 600', () => {
    const movs = [
      conteo('te', 1000),
      reg(armarProduccion(morena, CATALOGO_SEMILLA, 2)),
      reg(armarProduccion(stevia, CATALOGO_SEMILLA, 2)),
    ];
    expect(calcularStocks(movs).te).toBe(400);
  });

  it('editar la receta despues no cambia el stock historico', () => {
    const movs = [conteo('agua', 100), reg(armarProduccion(stevia, CATALOGO_SEMILLA, 1))];
    const antes = calcularStocks(movs).agua;
    stevia.receta.agua = 9; // receta editada despues
    try {
      expect(calcularStocks(movs).agua).toBe(antes);
      expect(antes).toBe(90);
    } finally {
      stevia.receta.agua = 10;
    }
  });

  it('un productoId desconocido en el log no rompe el calculo', () => {
    const movs = [conteo('te', 500), reg({ tipo: 'produccion', productoId: 'fantasma', lotes: 1, descuentos: { te: 150 } })];
    expect(calcularStocks(movs).te).toBe(350);
  });
});

describe('productoIdDeProduccion / armarProduccion', () => {
  it('un evento sin productoId se lee como morena', () => {
    expect(productoIdDeProduccion({})).toBe(ID_PRODUCTO_LEGADO);
    expect(ID_PRODUCTO_LEGADO).toBe('morena');
    expect(productoIdDeProduccion({ productoId: 'stevia' })).toBe('stevia');
  });

  it('armarProduccion guarda productoId, lotes y descuentos', () => {
    expect(armarProduccion(stevia, CATALOGO_SEMILLA, 3)).toMatchObject({
      tipo: 'produccion', productoId: 'stevia', lotes: 3,
    });
  });
});

describe('ultimosLotes', () => {
  it('devuelve los lotes de la ultima produccion de ese producto', () => {
    const movs = [
      reg(armarProduccion(morena, CATALOGO_SEMILLA, 2)),
      reg(armarProduccion(stevia, CATALOGO_SEMILLA, 4)),
    ];
    expect(ultimosLotes(movs, 'stevia')).toBe(4);
    expect(ultimosLotes(movs, 'morena')).toBe(2);
  });

  it('no depende del orden del arreglo, sino del timestamp', () => {
    const viejo = reg(armarProduccion(stevia, CATALOGO_SEMILLA, 1));
    const nuevo = reg(armarProduccion(stevia, CATALOGO_SEMILLA, 5));
    expect(ultimosLotes([nuevo, viejo], 'stevia')).toBe(5);
  });

  it('usa el defecto si el producto nunca se produjo, y cuenta eventos viejos como morena', () => {
    expect(ultimosLotes([], 'stevia')).toBe(2);
    expect(ultimosLotes([], 'stevia', 5)).toBe(5);
    const viejo = [reg({ tipo: 'produccion', lotes: 3, descuentos: {} })];
    expect(ultimosLotes(viejo, 'morena')).toBe(3);
    expect(ultimosLotes(viejo, 'stevia')).toBe(2);
  });
});
