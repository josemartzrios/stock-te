import type { Insumo } from '../domain';

export interface BorradorProducto {
  receta: Record<string, string>; // insumoId -> texto del campo
  objetivoLotes: string;
}

interface Props {
  insumos: Insumo[]; // activos
  borrador: BorradorProducto;
  onReceta: (insumoId: string, valor: string) => void;
  onObjetivo: (valor: string) => void;
}

/** Receta de un producto: un campo por insumo (0 o vacio = no lleva) y su objetivo de compra. */
export function RecetaEditor({ insumos, borrador, onReceta, onObjetivo }: Props) {
  return (
    <div className="tarjeta">
      <h3>Receta por lote</h3>
      {insumos.map((i) => (
        <div key={i.id} className="config-fila">
          <label htmlFor={`receta-${i.id}`}>{i.nombre}</label>
          <div className="entrada con-sufijo">
            <input
              id={`receta-${i.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={borrador.receta[i.id] ?? ''}
              onChange={(e) => onReceta(i.id, e.target.value)}
            />
            <span className="sufijo">{i.unidadBase}</span>
          </div>
        </div>
      ))}

      <div className="config-fila">
        <label htmlFor="objetivo">Lotes que quieres poder producir después de surtirte</label>
        <div className="entrada con-sufijo">
          <input
            id="objetivo"
            type="number"
            inputMode="numeric"
            min={1}
            value={borrador.objetivoLotes}
            onChange={(e) => onObjetivo(e.target.value)}
          />
          <span className="sufijo">lotes</span>
        </div>
      </div>
    </div>
  );
}
