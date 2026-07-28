import { useEffect, useState, type ReactNode } from 'react';
import { IconAtras } from './Icons';

interface Props {
  titulo: string;
  descripcion?: string;
  /** Sin titulo grande: el titulo vive en la barra superior. */
  compacto?: boolean;
  onVolver?: () => void;
  volverLabel?: string;
  /** Contenido al extremo derecho de la barra superior. */
  accion?: ReactNode;
  /** Barra pegada al pie con la accion principal, siempre al alcance del pulgar. */
  pie?: ReactNode;
  children: ReactNode;
}

/**
 * Armazon comun de todas las pantallas: barra superior pegajosa (con borde solo
 * cuando ya se hizo scroll), titulo grande estilo iOS y barra de accion al pie.
 */
export function Screen({
  titulo,
  descripcion,
  compacto,
  onVolver,
  volverLabel = 'Volver',
  accion,
  pie,
  children,
}: Props) {
  const [scrolleado, setScrolleado] = useState(false);

  useEffect(() => {
    const alScroll = () => setScrolleado(window.scrollY > 4);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  const hayBarra = Boolean(onVolver || accion || compacto);

  return (
    <div className={`pantalla${hayBarra ? '' : ' sin-barra'}`}>
      {hayBarra && (
        <header className={`appbar${scrolleado ? ' con-borde' : ''}`}>
          {onVolver && (
            <button className="icono-btn" onClick={onVolver} aria-label={volverLabel}>
              <IconAtras size={24} />
            </button>
          )}
          {compacto ? (
            <h1 className="titulo">{titulo}</h1>
          ) : (
            <span className="crece" aria-hidden="true" />
          )}
          {accion}
        </header>
      )}

      {!compacto && (
        <div className="cabecera">
          <h2>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      )}

      {children}

      {pie && <div className="barra-accion">{pie}</div>}
    </div>
  );
}
