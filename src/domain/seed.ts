import type { Insumo } from './types';

/**
 * Catalogo inicial real del negocio. Se siembra en el primer arranque.
 * El stock arranca en CERO eventos: el primer uso real es un conteo fisico.
 */
export const CATALOGO_SEMILLA: Insumo[] = [
  {
    id: 'te',
    nombre: 'Te oolong',
    unidadBase: 'g',
    consumoPorLote: 150,
    presentacionNombre: 'bolsa 1 kg',
    presentacionCantidad: 1000,
    presentacionPrecio: 154.0,
    umbralLotes: 3,
    activo: true,
  },
  {
    id: 'azucar',
    nombre: 'Azucar morena',
    unidadBase: 'g',
    consumoPorLote: 800,
    presentacionNombre: 'bolsa 900 g',
    presentacionCantidad: 900,
    presentacionPrecio: 22.5,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'limon',
    nombre: 'Limon deshidratado',
    unidadBase: 'g',
    consumoPorLote: 22,
    presentacionNombre: 'bolsa 1 kg',
    presentacionCantidad: 1000,
    presentacionPrecio: 237.0,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'pet',
    nombre: 'Botella PET 500ml',
    unidadBase: 'pza',
    consumoPorLote: 18,
    presentacionNombre: 'paquete 100 pzas',
    presentacionCantidad: 100,
    presentacionPrecio: 176.32,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'tapa',
    nombre: 'Tapa',
    unidadBase: 'pza',
    consumoPorLote: 18,
    presentacionNombre: 'paquete 100 pzas',
    presentacionCantidad: 100,
    presentacionPrecio: 41.76,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'agua',
    nombre: 'Agua garrafon',
    unidadBase: 'L',
    consumoPorLote: 9.5,
    presentacionNombre: 'garrafon 20 L',
    presentacionCantidad: 20,
    presentacionPrecio: 17.0,
    umbralLotes: 2,
    activo: true,
  },
];

export const CONFIG_SEMILLA = { capacidadObjetivo: 6 };
