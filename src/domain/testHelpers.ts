import type { MovimientoRegistro } from './types';

let contador = 0;
/** Crea un registro con timestamp creciente para forzar orden cronologico. */
export function reg(mov: MovimientoRegistro['mov']): MovimientoRegistro {
  contador += 1;
  const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, contador)).toISOString();
  return { id: `m${contador}`, timestamp: ts, mov };
}

/** Ajuste de carga inicial: sobre stock cero, descuadre = fisico. */
export function conteo(insumoId: string, fisico: number): MovimientoRegistro {
  return reg({ tipo: 'ajuste', insumoId, stockFisico: fisico, descuadre: fisico });
}
