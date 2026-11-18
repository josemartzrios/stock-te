import type { Insumo, Producto } from './types';

/** Hielo: lo congelas tu en charolas. Solo interesa saber si hay o no. */
export const HIELO: Insumo = {
  id: 'hielo',
  nombre: 'Hielo',
  unidadBase: 'charolas',
  presentacionNombre: 'charola',
  presentacionCantidad: 1,
  presentacionPrecio: 0,
  umbralLotes: 0,
  activo: true,
  hechoEnCasa: true,
};

/** Una etiqueta por botella, igual que PET y tapa. */
export const ETIQUETA_POR_LOTE = 18;

/** Etiqueta del te con azucar morena ("normal"). */
export const ETIQUETA_NORMAL: Insumo = {
  id: 'etiqueta-normal',
  nombre: 'Etiqueta te normal',
  unidadBase: 'pza',
  presentacionNombre: 'pedido 100 pzas',
  presentacionCantidad: 100,
  presentacionPrecio: 80,
  umbralLotes: 2,
  activo: true,
};

/** Etiqueta del te con stevia ("sin azucar"). */
export const ETIQUETA_SIN_AZUCAR: Insumo = {
  id: 'etiqueta-sin-azucar',
  nombre: 'Etiqueta te sin azucar',
  unidadBase: 'pza',
  presentacionNombre: 'pedido 100 pzas',
  presentacionCantidad: 100,
  presentacionPrecio: 80,
  umbralLotes: 2,
  activo: true,
};

/** Etiqueta que lleva cada producto (productoId -> insumo). Lo usan las migraciones. */
export const ETIQUETAS_PRODUCTO: Record<string, Insumo> = {
  morena: ETIQUETA_NORMAL,
  stevia: ETIQUETA_SIN_AZUCAR,
};

/**
 * Catalogo inicial real del negocio. Se siembra en el primer arranque.
 * El stock arranca en CERO eventos: el primer uso real es un conteo fisico.
 */
export const CATALOGO_SEMILLA: Insumo[] = [
  {
    id: 'te',
    nombre: 'Te oolong',
    unidadBase: 'g',
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
    presentacionNombre: 'bolsa 900 g',
    presentacionCantidad: 900,
    presentacionPrecio: 22.5,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'stevia',
    nombre: 'Stevia liquida',
    unidadBase: 'ml',
    presentacionNombre: 'frasco 65 ml',
    presentacionCantidad: 65,
    presentacionPrecio: 58.0,
    umbralLotes: 2,
    activo: true,
  },
  {
    id: 'limon',
    nombre: 'Limon deshidratado',
    unidadBase: 'g',
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
    presentacionNombre: 'garrafon 20 L',
    presentacionCantidad: 20,
    presentacionPrecio: 17.0,
    umbralLotes: 2,
    activo: true,
  },
  ETIQUETA_NORMAL,
  ETIQUETA_SIN_AZUCAR,
  HIELO,
];

/** Recetas por lote. Editables en Configuracion (aun no estan estandarizadas). */
export const PRODUCTOS_SEMILLA: Producto[] = [
  {
    id: 'morena',
    nombre: 'Te con azucar morena',
    receta: { te: 150, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5, 'etiqueta-normal': ETIQUETA_POR_LOTE },
    objetivoLotes: 3,
    activo: true,
  },
  {
    id: 'stevia',
    nombre: 'Te con stevia',
    receta: { te: 150, stevia: 30, limon: 22, pet: 18, tapa: 18, agua: 10, 'etiqueta-sin-azucar': ETIQUETA_POR_LOTE },
    objetivoLotes: 3,
    activo: true,
  },
];
