import { useCallback, useEffect, useState } from 'react';
import { inicializarAlmacen, type AlmacenRepositorio, type Datos } from '../domain';

export interface UseDatos {
  datos: Datos | null;
  cargando: boolean;
  /** Fallo al abrir la base o migrarla. Los datos no se tocan: no hay que reinstalar. */
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);

  const recargar = useCallback(async () => {
    setDatos(await repo.leerTodo());
  }, [repo]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await inicializarAlmacen(repo);
        const d = await repo.leerTodo();
        if (vivo) setDatos(d);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [repo]);

  return { datos, cargando, error, recargar };
}
