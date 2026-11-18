import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';

describe('semilla de productos', () => {
  const porId = Object.fromEntries(PRODUCTOS_SEMILLA.map((p) => [p.id, p]));

  it('tiene morena y stevia con objetivo de 3 lotes', () => {
    expect(PRODUCTOS_SEMILLA.map((p) => p.id)).toEqual(['morena', 'stevia']);
    expect(porId.morena.objetivoLotes).toBe(3);
    expect(porId.stevia.objetivoLotes).toBe(3);
  });

  it('receta de morena', () => {
    expect(porId.morena.receta).toEqual({
      te: 150, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5, 'etiqueta-normal': 18,
    });
  });

  it('receta de stevia', () => {
    expect(porId.stevia.receta).toEqual({
      te: 150, stevia: 30, limon: 22, pet: 18, tapa: 18, agua: 10, 'etiqueta-sin-azucar': 18,
    });
  });

  it('todo insumo de cada receta existe en el catalogo', () => {
    const ids = new Set(CATALOGO_SEMILLA.map((i) => i.id));
    for (const p of PRODUCTOS_SEMILLA) {
      for (const id of Object.keys(p.receta)) expect(ids.has(id)).toBe(true);
    }
  });

  it('insumo stevia: ml, frasco 65 ml, $58', () => {
    const s = CATALOGO_SEMILLA.find((i) => i.id === 'stevia')!;
    expect(s.unidadBase).toBe('ml');
    expect(s.presentacionCantidad).toBe(65);
    expect(s.presentacionPrecio).toBe(58);
  });
});
