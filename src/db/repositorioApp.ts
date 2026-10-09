import { crearAlmacenDB } from './esquema';
import { crearRepositorioDexie } from './repositorioDexie';

/** Repositorio real de la app (IndexedDB). Unico punto que conoce a Dexie. */
export const repositorioApp = crearRepositorioDexie(crearAlmacenDB());
