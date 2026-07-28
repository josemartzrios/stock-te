import { useCallback, useEffect, useState } from 'react';
import type { ConfigGlobal, Insumo, MovimientoRegistro } from '../domain';
import { inicializar, leerTodo } from '../db/db';

export interface Datos {
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  config: ConfigGlobal;
}

export interface UseDatos {
  datos: Datos | null;
  cargando: boolean;
  /** Vuelve a leer todo desde IndexedDB tras una escritura. */
  recargar: () => Promise<void>;
}

/**
 * Carga el catalogo, el log y la config desde Dexie a estado de React.
 * Tras cada escritura se llama `recargar()` para re-derivar todo.
 */
export function useDatos(): UseDatos {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const d = await leerTodo();
    setDatos(d);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      await inicializar();
      const d = await leerTodo();
      if (vivo) {
        setDatos(d);
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return { datos, cargando, recargar };
}
