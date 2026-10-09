import type { Sugerencia } from '../domain';
import { Screen } from './Screen';
import { cantidad, money, plural } from './format';
import { IconCheck } from './Icons';

interface Props {
  sugerencia: Sugerencia;
  onCancelar: () => void;
  onIrACompra: (insumoId: string) => void;
}

export function SugerenciaScreen({ sugerencia, onCancelar, onIrACompra }: Props) {
  const { lineas, costoTotal, objetivos } = sugerencia;
  const meta = objetivos
    .map((o) => `${o.lotes} ${plural(o.lotes, 'lote', 'lotes')} de ${o.nombre}`)
    .join(' y ');

  return (
    <Screen
      titulo="Qué comprar"
      descripcion={meta ? `Cantidades para volver a tener ${meta}.` : undefined}
      onVolver={onCancelar}
    >
      {lineas.length === 0 ? (
        <div className="vacio">
          <span className="marca">
            <IconCheck size={26} />
          </span>
          <b>Todo en orden</b>
          <p>No necesitas comprar nada por ahora.</p>
        </div>
      ) : (
        <>
          {lineas.map((l) => (
            <button
              key={l.insumo.id}
              className="sug"
              onClick={() => onIrACompra(l.insumo.id)}
            >
              <span className="cant">{l.presentaciones}</span>
              <span className="cuerpo">
                <b>{l.insumo.nombre}</b>
                <span className="pres">
                  {l.presentaciones} × {l.insumo.presentacionNombre} ={' '}
                  {cantidad(l.unidadesCompradas, l.insumo.unidadBase)}
                </span>
                <span className="actual">
                  Ahora tienes {cantidad(l.stockActual, l.insumo.unidadBase)} · {l.lotesActuales}{' '}
                  {plural(l.lotesActuales, 'lote', 'lotes')}
                </span>
              </span>
              <span className="costo">{money(l.costoEstimado)}</span>
            </button>
          ))}

          <div className="total">
            <span>Total estimado</span>
            <b>{money(costoTotal)}</b>
          </div>

          <p className="ayuda" style={{ textAlign: 'center', marginTop: 12 }}>
            Toca un renglón para registrar esa compra.
          </p>
        </>
      )}
    </Screen>
  );
}
