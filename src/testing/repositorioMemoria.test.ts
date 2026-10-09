import { crearRepositorioMemoria } from './repositorioMemoria';
import { ejecutarContrato } from './contratoRepositorio';

ejecutarContrato('memoria', async () => crearRepositorioMemoria());
