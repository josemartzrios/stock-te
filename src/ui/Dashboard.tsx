import type { Color, EstadoGlobal } from '../domain';
import { Screen } from './Screen';
import { cantidad, plural } from './format';
import {
  IconAlerta,
  IconBotella,
  IconCarrito,
  IconChevron,
  IconConteo,
  IconRayo,
} from './Icons';

interface Props {
  estado: EstadoGlobal;
  objetivo: number;
  sinMovimientos: boolean;
  onProduje: () => void;
  onCompre: (insumoId?: string) => void;
  onConte: () => void;
  onComprar: () => void;
}

const TEXTO_NIVEL: Record<Color, string> = {
  verde: 'Bien surtido',
  amarillo: 'Comprar pronto',
  rojo: 'Sin material',
};

export function Dashboard({
  estado,
  objetivo,
  sinMovimientos,
  onProduje,
  onCompre,
  onConte,
  onComprar,
}: Props) {
  const { lotesGlobal, cuelloBotella, insumos, hayQueComprar } = estado;
  const nivel: Color = lotesGlobal === 0 ? 'rojo' : hayQueComprar ? 'amarillo' : 'verde';
  const porComprar = insumos.filter((e) => e.necesitaCompra).length;
  const llenos = Math.min(lotesGlobal, objetivo);

  return (
    <Screen titulo="Almacén Té" compacto>
      <section className={`hero estado-${nivel}`}>
        <div className="fila-top">
          <p className="etiqueta">Puedes producir</p>
          <span className={`pill ${nivel}`}>{TEXTO_NIVEL[nivel]}</span>
        </div>

        <div className="cifra">
          <b>{lotesGlobal}</b>
          <span>{plural(lotesGlobal, 'lote', 'lotes')}</span>
        </div>

        <p className="nota">
          {lotesGlobal === 0 ? (
            cuelloBotella ? (
              <>
                Te quedaste sin <strong>{cuelloBotella.nombre}</strong>
              </>
            ) : (
              'Todavía no hay insumos registrados'
            )
          ) : cuelloBotella ? (
            <>
              Primero se acaba <strong>{cuelloBotella.nombre}</strong>
            </>
          ) : null}
        </p>

        {objetivo <= 12 ? (
          <div className={`segmentos estado-${nivel}`} aria-hidden="true">
            {Array.from({ length: objetivo }, (_, i) => (
              <i key={i} className={i < llenos ? 'on' : ''} />
            ))}
          </div>
        ) : (
          <div className="barra" style={{ marginTop: 16 }} aria-hidden="true">
            <i className={nivel} style={{ width: `${Math.min(llenos / objetivo, 1) * 100}%` }} />
          </div>
        )}

        <div className="escala">
          <span>0</span>
          <span>
            meta {objetivo} {plural(objetivo, 'lote', 'lotes')}
          </span>
        </div>
      </section>

      {sinMovimientos ? (
        <button className="aviso-accion brand" onClick={onConte}>
          <span className="marca">
            <IconRayo size={20} />
          </span>
          <span className="cuerpo">
            <b>Empieza con un conteo físico</b>
            <span>Captura cuánto tienes hoy de cada insumo</span>
          </span>
          <IconChevron size={20} className="flecha" />
        </button>
      ) : (
        hayQueComprar && (
          <button className="aviso-accion" onClick={onComprar}>
            <span className="marca">
              <IconAlerta size={20} />
            </span>
            <span className="cuerpo">
              <b>
                {porComprar} {plural(porComprar, 'insumo', 'insumos')} por debajo del mínimo
              </b>
              <span>Ver qué comprar y cuánto cuesta</span>
            </span>
            <IconChevron size={20} className="flecha" />
          </button>
        )
      )}

      <div className="seccion">
        <h3>Registrar</h3>
      </div>

      <div className="acciones">
        <button className="accion produje" onClick={onProduje}>
          <span className="marca">
            <IconBotella size={22} />
          </span>
          Produje
        </button>
        <button className="accion compre" onClick={() => onCompre()}>
          <span className="marca">
            <IconCarrito size={22} />
          </span>
          Compré
        </button>
        <button className="accion conte" onClick={onConte}>
          <span className="marca">
            <IconConteo size={22} />
          </span>
          Conté
        </button>
      </div>

      <div className="seccion">
        <h3>Insumos</h3>
        <span className="dato">
          {insumos.length} {plural(insumos.length, 'activo', 'activos')}
        </span>
      </div>

      <div className="lista">
        {insumos.map((e) => {
          const llenado = Math.min(e.lotes / Math.max(objetivo, 1), 1) * 100;
          return (
            <button
              key={e.insumo.id}
              className="insumo"
              onClick={() => onCompre(e.insumo.id)}
              aria-label={`${e.insumo.nombre}: ${cantidad(e.stock, e.insumo.unidadBase)}. Registrar compra`}
            >
              <span className="nombre">
                <i className={`punto-estado ${e.color}`} />
                <span>{e.insumo.nombre}</span>
              </span>
              <span className={`medida${e.negativo ? ' neg' : ''}`}>
                {cantidad(e.stock, e.insumo.unidadBase)}
              </span>
              <IconChevron size={18} className="flecha" />
              <span className="pie">
                <span className="barra">
                  <i className={e.color} style={{ width: `${llenado}%` }} />
                </span>
                <span className={`txt${e.negativo ? ' alerta' : ''}`}>
                  {e.negativo
                    ? 'Negativo · contar físico'
                    : `${e.lotes} ${plural(e.lotes, 'lote', 'lotes')}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
