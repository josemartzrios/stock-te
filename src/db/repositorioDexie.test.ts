import 'fake-indexeddb/auto';
import { ejecutarContrato } from '../testing/contratoRepositorio';
import { crearAlmacenDB } from './esquema';
import { crearRepositorioDexie } from './repositorioDexie';

let n = 0;
ejecutarContrato('dexie', async () => {
  n += 1;
  return crearRepositorioDexie(crearAlmacenDB(`contrato-${n}`));
});
