import type { Color, EstadoProducto } from '../domain';
import { plural } from './format';
import { IconBotella } from './Icons';

interface Props {
  estado: EstadoProducto;
  onProduje: (productoId: string) => void;
}

const TEXTO_NIVEL: Record<Color, string> = {
  verde: 'Bien surtido',
  amarillo: 'Comprar pronto',
  rojo: 'Sin material',
};

/** Una tarjeta por producto: cuanto alcanza, que se acaba primero y su boton "Produje". */
export function ProductoCard({ estado, onProduje }: Props) {
  const { producto, lotes, cuelloBotella, color } = estado;
  const objetivo = producto.objetivoLotes;
  const llenos = Math.min(lotes, objetivo);

  return (
    <section className={`hero hero-producto estado-${color}`} aria-label={producto.nombre}>
      <div className="fila-top">
        <p className="etiqueta">{producto.nombre}</p>
        <span className={`pill ${color}`}>{TEXTO_NIVEL[color]}</span>
      </div>

      <div className="cifra">
        <b>{lotes}</b>
        <span>{plural(lotes, 'lote', 'lotes')}</span>
      </div>

      <p className="nota">
        {cuelloBotella ? (
          lotes === 0 ? (
            <>
              Te quedaste sin <strong>{cuelloBotella.nombre}</strong>
            </>
          ) : (
            <>
              Primero se acaba <strong>{cuelloBotella.nombre}</strong>
            </>
          )
        ) : (
          'Sin receta configurada'
        )}
      </p>

      {objetivo > 0 && objetivo <= 12 ? (
        <div className={`segmentos estado-${color}`} aria-hidden="true">
          {Array.from({ length: objetivo }, (_, i) => (
            <i key={i} className={i < llenos ? 'on' : ''} />
          ))}
        </div>
      ) : (
        <div className="barra" style={{ marginTop: 16 }} aria-hidden="true">
          <i className={color} style={{ width: `${Math.min(llenos / Math.max(objetivo, 1), 1) * 100}%` }} />
        </div>
      )}
      <div className="escala">
        <span>0</span>
        <span>
          meta {objetivo} {plural(objetivo, 'lote', 'lotes')}
        </span>
      </div>

      <button
        className="btn btn-primario"
        onClick={() => onProduje(producto.id)}
        aria-label={`Registrar producción de ${producto.nombre}`}
      >
        <IconBotella size={20} /> Produje
      </button>
    </section>
  );
}
