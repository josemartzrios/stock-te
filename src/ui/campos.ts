/** Numero valido y no negativo; si no, se conserva el valor anterior. */
export function num(v: string, previo: number): number {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : previo;
}
