import { useCallback, useEffect, useState } from 'react';
import { inicializarAlmacen, type AlmacenRepositorio, type Datos } from '../domain';

export interface UseDatos {
  datos: Datos | null;
  cargando: boolean;
  /** Vuelve a leer todo desde el repositorio tras una escritura. */
  recargar: () => Promise<void>;
}

/**
 * Carga catalogo, productos y log desde el repositorio a estado de React.
 * Tras cada escritura se llama `recargar()` para re-derivar todo.
 */
export function useDatos(repo: AlmacenRepositorio): UseDatos {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setDatos(await repo.leerTodo());
  }, [repo]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      await inicializarAlmacen(repo);
      const d = await repo.leerTodo();
      if (vivo) {
        setDatos(d);
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [repo]);

  return { datos, cargando, recargar };
}
