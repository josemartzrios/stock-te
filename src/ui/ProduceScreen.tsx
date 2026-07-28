import { useMemo, useState } from 'react';
import type { Insumo, MovimientoRegistro } from '../domain';
import { calcularDescuentos, calcularStocks, lotesRestantes } from '../domain';
import { agregarMovimiento } from '../db/db';
import { Screen } from './Screen';
import { cantidad, plural } from './format';
import { IconAlerta, IconMas, IconMenos } from './Icons';

interface Props {
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  onGuardado: (msg: string) => void;
  onCancelar: () => void;
}

const ATAJOS = [1, 2, 3, 4, 6];
const MAX = 20;

export function ProduceScreen({ insumos, movimientos, onGuardado, onCancelar }: Props) {
  const [lotes, setLotes] = useState(2); // caso comun
  const [guardando, setGuardando] = useState(false);

  const activos = useMemo(() => insumos.filter((i) => i.activo), [insumos]);
  const stocks = useMemo(() => calcularStocks(movimientos), [movimientos]);
  const descuentos = calcularDescuentos(insumos, lotes);

  // Previsualizacion: cuanto queda de cada insumo DESPUES de esta produccion.
  const despues = activos.map((i) => {
    const resta = descuentos[i.id] ?? 0;
    const queda = (stocks[i.id] ?? 0) - resta;
    return { insumo: i, resta, queda, ...lotesRestantes(queda, i.consumoPorLote) };
  });
  const insuficientes = despues.filter((d) => d.queda < 0);
  const lotesDespues = despues.length ? Math.min(...despues.map((d) => d.lotes)) : 0;

  async function guardar() {
    setGuardando(true);
    await agregarMovimiento({ tipo: 'produccion', lotes, descuentos });
    onGuardado(`Registré ${lotes} ${plural(lotes, 'lote', 'lotes')}`);
  }

  return (
    <Screen
      titulo="¿Cuántos lotes produjiste?"
      onVolver={onCancelar}
      volverLabel="Cancelar"
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
          Registrar {lotes} {plural(lotes, 'lote', 'lotes')}
        </button>
      }
    >
      <div className="stepper">
        <button
          onClick={() => setLotes((n) => Math.max(1, n - 1))}
          disabled={lotes <= 1}
          aria-label="Un lote menos"
        >
          <IconMenos size={26} />
        </button>
        <span className="valor" aria-live="polite">
          {lotes}
        </span>
        <button
          onClick={() => setLotes((n) => Math.min(MAX, n + 1))}
          disabled={lotes >= MAX}
          aria-label="Un lote más"
        >
          <IconMas size={26} />
        </button>
      </div>

      <div className="chips">
        {ATAJOS.map((n) => (
          <button
            key={n}
            className={`chip${lotes === n ? ' sel' : ''}`}
            onClick={() => setLotes(n)}
            aria-pressed={lotes === n}
          >
            {n}
          </button>
        ))}
      </div>

      {insuficientes.length > 0 && (
        <div className="aviso" style={{ marginTop: 20, marginBottom: 0 }}>
          <IconAlerta size={18} />
          <span>
            Con {lotes} {plural(lotes, 'lote', 'lotes')} el stock de{' '}
            {insuficientes.map((d) => d.insumo.nombre).join(', ')} queda en negativo. Se registra
            igual, pero conviene hacer un conteo físico.
          </span>
        </div>
      )}

      <div className="seccion">
        <h3>Se descontará</h3>
        <span className="dato">
          después te alcanza para {lotesDespues} {plural(lotesDespues, 'lote', 'lotes')}
        </span>
      </div>

      <div className="filas">
        {despues.map((d) => (
          <div key={d.insumo.id} className="fila">
            <span>
              {d.insumo.nombre}
              <span className="sub">
                queda {cantidad(d.queda, d.insumo.unidadBase)} · {d.lotes}{' '}
                {plural(d.lotes, 'lote', 'lotes')}
              </span>
            </span>
            <span className={`valor${d.queda < 0 ? ' neg' : ''}`}>
              −{cantidad(d.resta, d.insumo.unidadBase)}
            </span>
          </div>
        ))}
      </div>
    </Screen>
  );
}
