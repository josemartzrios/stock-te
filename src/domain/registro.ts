import type { Movimiento, MovimientoRegistro } from './types';

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Envuelve un movimiento con su id y la hora de registro. */
export function crearRegistro(mov: Movimiento, ahora: Date = new Date()): MovimientoRegistro {
  return { id: nuevoId(), timestamp: ahora.toISOString(), mov };
}
