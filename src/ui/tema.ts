import { useCallback, useEffect, useState } from 'react';

export type Tema = 'auto' | 'claro' | 'oscuro';

const CLAVE = 'almacen-tema';
const consulta = '(prefers-color-scheme: dark)';

function leer(): Tema {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Traduce la preferencia a la paleta que toca pintar ahora mismo. */
function resolver(tema: Tema): 'claro' | 'oscuro' {
  if (tema !== 'auto') return tema;
  return typeof matchMedia === 'function' && matchMedia(consulta).matches ? 'oscuro' : 'claro';
}

/**
 * Preferencia de apariencia. El CSS solo conoce `data-tema-efectivo`, asi que
 * la paleta oscura se declara una vez sola y el modo automatico se resuelve
 * aqui (y en el script inline de index.html, para no parpadear al arrancar).
 */
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTemaEstado] = useState<Tema>(leer);

  useEffect(() => {
    const aplicar = () => {
      document.documentElement.dataset.temaEfectivo = resolver(tema);
    };
    aplicar();
    if (tema !== 'auto' || typeof matchMedia !== 'function') return;
    const mq = matchMedia(consulta);
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [tema]);

  const setTema = useCallback((t: Tema) => {
    setTemaEstado(t);
    try {
      localStorage.setItem(CLAVE, t);
    } catch {
      // modo privado / almacenamiento lleno: la sesion actual igual funciona
    }
  }, []);

  return [tema, setTema];
}
