import type { Insumo } from '../domain';

export interface BorradorInsumo {
  presentacionNombre: string;
  presentacionCantidad: string;
  presentacionPrecio: string;
  umbralLotes: string;
}

interface Props {
  insumo: Insumo;
  borrador: BorradorInsumo;
  onCambio: (campo: keyof BorradorInsumo, valor: string) => void;
}

/** Compra de un insumo: presentacion (nombre y tamano), precio vigente y umbral de aviso. */
export function InsumoEditor({ insumo: i, borrador, onCambio }: Props) {
  return (
    <div className="tarjeta">
      <h3>{i.nombre}</h3>

      <div className="config-fila">
        <label htmlFor={`pres-${i.id}`}>Presentación</label>
        <div className="entrada">
          <input
            id={`pres-${i.id}`}
            type="text"
            value={borrador.presentacionNombre}
            onChange={(e) => onCambio('presentacionNombre', e.target.value)}
          />
        </div>
      </div>

      <div className="config-fila">
        <label htmlFor={`cant-${i.id}`}>Cuánto trae cada presentación</label>
        <div className="entrada con-sufijo">
          <input
            id={`cant-${i.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={borrador.presentacionCantidad}
            onChange={(e) => onCambio('presentacionCantidad', e.target.value)}
          />
          <span className="sufijo">{i.unidadBase}</span>
        </div>
      </div>

      <div className="config-fila">
        <label htmlFor={`precio-${i.id}`}>Precio vigente</label>
        <div className="entrada con-prefijo">
          <span className="prefijo">$</span>
          <input
            id={`precio-${i.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={borrador.presentacionPrecio}
            onChange={(e) => onCambio('presentacionPrecio', e.target.value)}
          />
        </div>
      </div>

      <div className="config-fila">
        <label htmlFor={`umbral-${i.id}`}>Avisarme cuando baje de</label>
        <div className="entrada con-sufijo">
          <input
            id={`umbral-${i.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={borrador.umbralLotes}
            onChange={(e) => onCambio('umbralLotes', e.target.value)}
          />
          <span className="sufijo">lotes</span>
        </div>
      </div>
    </div>
  );
}
