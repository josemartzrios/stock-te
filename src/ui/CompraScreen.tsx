import { useMemo, useState } from 'react';
import type { Insumo, MovimientoRegistro } from '../domain';
import { calcularStocks, lotesRestantes } from '../domain';
import { agregarMovimiento } from '../db/db';
import { Screen } from './Screen';
import { cantidad, money, plural } from './format';
import { IconCaja, IconChevron, IconMas, IconMenos } from './Icons';

interface Props {
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  /** Insumo preseleccionado al entrar desde la lista del inicio. */
  insumoId?: string;
  onGuardado: (msg: string) => void;
  onCancelar: () => void;
}

const MAX = 99;

export function CompraScreen({ insumos, movimientos, insumoId, onGuardado, onCancelar }: Props) {
  const activos = useMemo(() => insumos.filter((i) => i.activo), [insumos]);
  const stocks = useMemo(() => calcularStocks(movimientos), [movimientos]);

  const [sel, setSel] = useState<Insumo | null>(
    () => activos.find((i) => i.id === insumoId) ?? null,
  );
  const [pres, setPres] = useState(1);
  const [costo, setCosto] = useState('');
  const [costoTocado, setCostoTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const unidades = sel ? pres * sel.presentacionCantidad : 0;
  const costoSugerido = sel ? pres * sel.presentacionPrecio : 0;
  const costoMostrado = costoTocado ? costo : costoSugerido ? costoSugerido.toFixed(2) : '';

  function elegir(i: Insumo) {
    setSel(i);
    setPres(1);
    setCosto('');
    setCostoTocado(false);
  }

  async function guardar() {
    if (!sel) return;
    setGuardando(true);
    const costoTotal = costoMostrado === '' ? undefined : Number(costoMostrado);
    await agregarMovimiento({
      tipo: 'compra',
      insumoId: sel.id,
      cantidad: unidades,
      ...(costoTotal !== undefined && !Number.isNaN(costoTotal) ? { costoTotal } : {}),
    });
    onGuardado(`Compra de ${sel.nombre} registrada`);
  }

  if (!sel) {
    return (
      <Screen
        titulo="¿Qué compraste?"
        descripcion="Elige el insumo para registrar la entrada."
        onVolver={onCancelar}
        volverLabel="Cancelar"
      >
        <div className="selector">
          {activos.map((i) => (
            <button key={i.id} className="opcion" onClick={() => elegir(i)}>
              <span className="marca">
                <IconCaja size={20} />
              </span>
              <span className="cuerpo">
                <b>{i.nombre}</b>
                <span>
                  {i.presentacionNombre} · {money(i.presentacionPrecio)}
                </span>
              </span>
              <IconChevron size={20} className="flecha" />
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  const stockNuevo = (stocks[sel.id] ?? 0) + unidades;
  const { lotes: lotesNuevos } = lotesRestantes(stockNuevo, sel.consumoPorLote);

  return (
    <Screen
      titulo={sel.nombre}
      descripcion={`Se compra por ${sel.presentacionNombre}.`}
      onVolver={() => setSel(null)}
      volverLabel="Cambiar insumo"
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando || pres <= 0}>
          Guardar compra
        </button>
      }
    >
      <div className="campo">
        <label id="lbl-pres">¿Cuántas presentaciones?</label>
        <div className="stepper" role="group" aria-labelledby="lbl-pres">
          <button
            onClick={() => setPres((n) => Math.max(1, n - 1))}
            disabled={pres <= 1}
            aria-label="Una menos"
          >
            <IconMenos size={26} />
          </button>
          <span className="valor" aria-live="polite">
            {pres}
          </span>
          <button
            onClick={() => setPres((n) => Math.min(MAX, n + 1))}
            disabled={pres >= MAX}
            aria-label="Una más"
          >
            <IconMas size={26} />
          </button>
        </div>
        <p className="ayuda">
          {pres} × {sel.presentacionNombre}
        </p>
      </div>

      <div className="resumen">
        + {cantidad(unidades, sel.unidadBase)} · quedas con {lotesNuevos}{' '}
        {plural(lotesNuevos, 'lote', 'lotes')}
      </div>

      <div className="campo">
        <label htmlFor="costo">Costo total</label>
        <div className="entrada con-prefijo">
          <span className="prefijo">$</span>
          <input
            id="costo"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={costoMostrado}
            onChange={(e) => {
              setCosto(e.target.value);
              setCostoTocado(true);
            }}
          />
        </div>
        <p className="ayuda">
          {costoTocado
            ? 'Opcional. Déjalo vacío si no quieres registrarlo.'
            : `Prellenado con el precio vigente: ${pres} × ${money(sel.presentacionPrecio)}. Puedes corregirlo.`}
        </p>
      </div>
    </Screen>
  );
}
