import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, PRODUCTOS_SEMILLA } from './seed';
import { calcularSugerencia } from './sugerencia';

// Stock real del negocio en la carga inicial; stevia aun no se compra.
const A = {
  te: 100, azucar: 1792, limon: 795, pet: 35, tapa: 35, agua: 190, stevia: 0,
  'etiqueta-normal': 1000, 'etiqueta-sin-azucar': 1000,
};

describe('calcularSugerencia (mezcla 3 + 3)', () => {
  const sug = calcularSugerencia(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, A);
  const porInsumo = Object.fromEntries(sug.lineas.map((l) => [l.insumo.id, l]));

  it('incluye solo los insumos bajo umbral', () => {
    expect(sug.lineas.map((l) => l.insumo.id).sort()).toEqual(['azucar', 'pet', 'stevia', 'tapa', 'te']);
  });

  it('te suma el objetivo de ambos productos: 3x150 + 3x150 = 900 g', () => {
    expect(porInsumo.te.faltante).toBe(800);
    expect(porInsumo.te.presentaciones).toBe(1);
    expect(porInsumo.te.costoEstimado).toBeCloseTo(154.0, 2);
  });

  it('azucar solo cuenta el objetivo de morena (2400 g)', () => {
    expect(porInsumo.azucar.faltante).toBe(608);
    expect(porInsumo.azucar.presentaciones).toBe(1);
    expect(porInsumo.azucar.costoEstimado).toBeCloseTo(22.5, 2);
  });

  it('PET y tapa: 108 pzas requeridas, 1 paquete cada uno', () => {
    expect(porInsumo.pet.presentaciones).toBe(1);
    expect(porInsumo.pet.costoEstimado).toBeCloseTo(176.32, 2);
    expect(porInsumo.tapa.costoEstimado).toBeCloseTo(41.76, 2);
  });

  it('stevia solo cuenta el objetivo de stevia: 90 ml => 2 frascos de 65 ml', () => {
    expect(porInsumo.stevia.faltante).toBe(90);
    expect(porInsumo.stevia.presentaciones).toBe(2);
    expect(porInsumo.stevia.unidadesCompradas).toBe(130);
    expect(porInsumo.stevia.costoEstimado).toBeCloseTo(116, 2);
  });

  it('total y objetivos por producto', () => {
    expect(sug.costoTotal).toBeCloseTo(510.58, 2);
    expect(sug.objetivos).toEqual([
      { productoId: 'morena', nombre: 'Te con azucar morena', lotes: 3 },
      { productoId: 'stevia', nombre: 'Te con stevia', lotes: 3 },
    ]);
  });

  it('lotesActuales es el peor caso entre productos', () => {
    expect(porInsumo.azucar.lotesActuales).toBe(2);
    expect(porInsumo.te.lotesActuales).toBe(0);
  });
});

describe('calcularSugerencia: casos limite', () => {
  it('un producto inactivo no suma al requerido (sin stevia: te 450)', () => {
    const ps = [PRODUCTOS_SEMILLA[0], { ...PRODUCTOS_SEMILLA[1], activo: false }];
    const s = calcularSugerencia(CATALOGO_SEMILLA, ps, A);
    expect(s.lineas.find((l) => l.insumo.id === 'te')?.faltante).toBe(350);
    expect(s.lineas.find((l) => l.insumo.id === 'stevia')).toBeUndefined();
    expect(s.objetivos).toHaveLength(1);
  });

  it('un insumo que ya cubre el objetivo no aparece', () => {
    const s = calcularSugerencia(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...A, te: 5000 });
    expect(s.lineas.find((l) => l.insumo.id === 'te')).toBeUndefined();
  });

  it('un insumo bajo umbral pero cubierto no aparece (faltante <= 0)', () => {
    const ps = [{ ...PRODUCTOS_SEMILLA[0], objetivoLotes: 0 }];
    const s = calcularSugerencia(CATALOGO_SEMILLA, ps, A);
    expect(s.lineas).toHaveLength(0);
  });

  it('stock negativo cuenta como 0 lotes y el faltante incluye el negativo', () => {
    const s = calcularSugerencia(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...A, te: -100 });
    const te = s.lineas.find((l) => l.insumo.id === 'te')!;
    expect(te.faltante).toBe(1000);
    expect(te.lotesActuales).toBe(0);
    expect(te.presentaciones).toBe(1);
  });
});
