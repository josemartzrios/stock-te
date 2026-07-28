import { describe, it, expect } from 'vitest';
import { calcularEstado, calcularSugerencia } from './calc';
import { CATALOGO_SEMILLA, CONFIG_SEMILLA } from './seed';
import type { MovimientoRegistro } from './types';

/**
 * Fixture con el stock real del negocio en la carga inicial (dia 1).
 * La carga inicial son ajustes por conteo sobre stock cero: como el teorico
 * es 0, el descuadre = fisico.
 */
let n = 0;
function conteo(insumoId: string, fisico: number): MovimientoRegistro {
  n += 1;
  return {
    id: `c${n}`,
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
    mov: { tipo: 'ajuste', insumoId, stockFisico: fisico, descuadre: fisico },
  };
}

const stockReal: MovimientoRegistro[] = [
  conteo('te', 100),
  conteo('azucar', 1792),
  conteo('limon', 795),
  conteo('pet', 35),
  conteo('tapa', 35),
  conteo('agua', 190),
];

describe('fixture stock real del negocio (carga inicial)', () => {
  const estado = calcularEstado(CATALOGO_SEMILLA, stockReal);
  const porId = Object.fromEntries(estado.insumos.map((e) => [e.insumo.id, e]));

  it('te 100 g => 0 lotes, rojo, cuello de botella global', () => {
    expect(porId.te.stock).toBe(100);
    expect(porId.te.lotes).toBe(0);
    expect(porId.te.color).toBe('rojo');
    expect(estado.lotesGlobal).toBe(0);
    expect(estado.cuelloBotella?.id).toBe('te');
  });

  it('azucar 1792 g => 2 lotes, amarillo', () => {
    expect(porId.azucar.lotes).toBe(2); // floor(1792/800)
    expect(porId.azucar.color).toBe('amarillo');
  });

  it('PET 35 y tapas 35 => 1 lote (floor 35/18), amarillo', () => {
    expect(porId.pet.lotes).toBe(1);
    expect(porId.pet.color).toBe('amarillo');
    expect(porId.tapa.lotes).toBe(1);
    expect(porId.tapa.color).toBe('amarillo');
  });

  it('limon 795 g => 36 lotes, verde', () => {
    expect(porId.limon.lotes).toBe(36); // floor(795/22)
    expect(porId.limon.color).toBe('verde');
  });

  it('agua 190 L => 20 lotes, verde', () => {
    expect(porId.agua.lotes).toBe(20); // floor(190/9.5)
    expect(porId.agua.color).toBe('verde');
  });

  it('la sugerencia incluye te, azucar, PET y tapa con costos correctos', () => {
    const sug = calcularSugerencia(CATALOGO_SEMILLA, stockReal, CONFIG_SEMILLA);
    const ids = sug.lineas.map((l) => l.insumo.id).sort();
    expect(ids).toEqual(['azucar', 'pet', 'tapa', 'te']);

    const porInsumo = Object.fromEntries(sug.lineas.map((l) => [l.insumo.id, l]));
    // te: objetivo 900, stock 100, faltan 800 -> 1 bolsa 1kg -> $154
    expect(porInsumo.te.presentaciones).toBe(1);
    expect(porInsumo.te.costoEstimado).toBeCloseTo(154.0, 2);
    // azucar: objetivo 4800, stock 1792, faltan 3008 -> ceil(3008/900)=4 -> $90
    expect(porInsumo.azucar.presentaciones).toBe(4);
    expect(porInsumo.azucar.costoEstimado).toBeCloseTo(90.0, 2);
    // PET: objetivo 108, stock 35, faltan 73 -> 1 paquete -> $176.32
    expect(porInsumo.pet.presentaciones).toBe(1);
    expect(porInsumo.pet.costoEstimado).toBeCloseTo(176.32, 2);
    // tapa: objetivo 108, stock 35, faltan 73 -> 1 paquete -> $41.76
    expect(porInsumo.tapa.presentaciones).toBe(1);
    expect(porInsumo.tapa.costoEstimado).toBeCloseTo(41.76, 2);

    expect(sug.costoTotal).toBeCloseTo(462.08, 2);
  });
});
