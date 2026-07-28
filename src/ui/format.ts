import type { Color } from '../domain';

/** Texto del semaforo (antes eran emojis de colores, ilegibles para lectores de pantalla). */
export const ETIQUETA_ESTADO: Record<Color, string> = {
  verde: 'Bien surtido',
  amarillo: 'Hay que comprar',
  rojo: 'Sin material',
};

const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

const miles = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

export function money(n: number): string {
  return pesos.format(n);
}

/** Cantidad con su unidad base, sin decimales innecesarios. */
export function cantidad(n: number, unidad: string): string {
  return `${miles.format(n)} ${unidad}`;
}

export function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Clave YYYY-MM-DD en hora local, para agrupar el historial por dia. */
export function claveDia(iso: string): string {
  const d = new Date(iso);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "Hoy" / "Ayer" / "12 de julio" a partir de una clave de dia. */
export function etiquetaDia(clave: string): string {
  const [a, m, d] = clave.split('-').map(Number);
  const fechaDia = new Date(a, m - 1, d);
  const hoy = new Date();
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - fechaDia.getTime()) /
      86_400_000,
  );
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return fechaDia.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    ...(fechaDia.getFullYear() !== hoy.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function plural(n: number, sing: string, plur: string): string {
  return n === 1 ? sing : plur;
}
