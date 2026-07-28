import { useMemo, useState } from 'react';
import type { Insumo, MovimientoRegistro } from '../domain';
import { calcularDescuadre, calcularStocks } from '../domain';
import { agregarMovimiento } from '../db/db';
import { Screen } from './Screen';
import { cantidad, plural } from './format';
import { IconCaja, IconChevron, IconConteo } from './Icons';

interface Props {
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
  onGuardado: (msg: string) => void;
  onCancelar: () => void;
}

export function ConteoScreen({ insumos, movimientos, onGuardado, onCancelar }: Props) {
  const activos = useMemo(() => insumos.filter((i) => i.activo), [insumos]);
  const stocks = useMemo(() => calcularStocks(movimientos), [movimientos]);

  // cola null = pantalla de eleccion; con 1 elemento = conteo suelto
  const [cola, setCola] = useState<Insumo[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [fisico, setFisico] = useState('');
  const [nota, setNota] = useState('');
  const [guardados, setGuardados] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const actual = cola ? cola[idx] : null;
  const teorico = actual ? stocks[actual.id] ?? 0 : 0;
  const fisicoNum = fisico === '' ? null : Number(fisico);
  const descuadre = fisicoNum === null ? 0 : calcularDescuadre(fisicoNum, teorico);
  const esSecuencia = Boolean(cola && cola.length > 1);
  const ultimo = !cola || idx >= cola.length - 1;

  function empezar(lista: Insumo[]) {
    setCola(lista);
    setIdx(0);
    setFisico('');
    setNota('');
    setGuardados(0);
  }

  function limpiar() {
    setFisico('');
    setNota('');
  }

  function terminar(cuantos: number) {
    if (cuantos === 0) return onCancelar();
    onGuardado(
      esSecuencia
        ? `Conteo guardado · ${cuantos} ${plural(cuantos, 'insumo', 'insumos')}`
        : `Conté ${cola?.[idx]?.nombre ?? ''}`,
    );
  }

  function siguiente(sumar: number) {
    const total = guardados + sumar;
    setGuardados(total);
    if (!ultimo) {
      setIdx(idx + 1);
      limpiar();
      setGuardando(false);
    } else {
      terminar(total);
    }
  }

  async function guardar() {
    if (!actual || fisicoNum === null) return;
    setGuardando(true);
    await agregarMovimiento({
      tipo: 'ajuste',
      insumoId: actual.id,
      stockFisico: fisicoNum,
      descuadre,
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    siguiente(1);
  }

  // ---------- Eleccion ----------
  if (!actual) {
    return (
      <Screen
        titulo="¿Qué vas a contar?"
        descripcion="El conteo corrige el stock teórico y deja registrado el descuadre."
        onVolver={onCancelar}
        volverLabel="Cancelar"
      >
        <div className="selector">
          <button className="opcion destacada" onClick={() => empezar(activos)}>
            <span className="marca">
              <IconConteo size={20} />
            </span>
            <span className="cuerpo">
              <b>Contar todo</b>
              <span>Los {activos.length} insumos, uno tras otro</span>
            </span>
            <IconChevron size={20} className="flecha" />
          </button>
        </div>

        <div className="seccion">
          <h3>O solo uno</h3>
        </div>

        <div className="selector">
          {activos.map((i) => (
            <button key={i.id} className="opcion" onClick={() => empezar([i])}>
              <span className="marca">
                <IconCaja size={20} />
              </span>
              <span className="cuerpo">
                <b>{i.nombre}</b>
                <span>Teórico: {cantidad(stocks[i.id] ?? 0, i.unidadBase)}</span>
              </span>
              <IconChevron size={20} className="flecha" />
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  // ---------- Captura ----------
  // Atras vuelve a la eleccion mientras no haya nada guardado; despues cierra
  // el conteo conservando lo ya capturado.
  const clase = descuadre === 0 ? 'cero' : descuadre > 0 ? 'pos' : 'neg';
  const avance = cola ? ((idx + 1) / cola.length) * 100 : 100;

  return (
    <Screen
      titulo={actual.nombre}
      descripcion={`¿Cuánto hay físicamente, en ${actual.unidadBase}?`}
      onVolver={() => (guardados === 0 ? setCola(null) : terminar(guardados))}
      volverLabel={guardados === 0 ? 'Elegir otro insumo' : 'Salir del conteo'}
      pie={
        <>
          <button
            className="btn btn-primario"
            onClick={guardar}
            disabled={guardando || fisicoNum === null}
          >
            {ultimo ? 'Guardar conteo' : 'Guardar y siguiente'}
          </button>
          {!ultimo && (
            <button className="btn btn-secundario" onClick={() => siguiente(0)}>
              Omitir este insumo
            </button>
          )}
        </>
      }
    >
      {esSecuencia && cola && (
        <div className="campo" style={{ marginBottom: 22 }}>
          <div className="seccion" style={{ margin: '0 2px 8px' }}>
            <h3>Progreso</h3>
            <span className="dato">
              {idx + 1} de {cola.length}
            </span>
          </div>
          <div className="barra">
            <i style={{ width: `${avance}%` }} />
          </div>
        </div>
      )}

      <div className="campo">
        <div className="entrada con-sufijo">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            min={0}
            value={fisico}
            placeholder="0"
            onChange={(e) => setFisico(e.target.value)}
            aria-label={`Cantidad física de ${actual.nombre} en ${actual.unidadBase}`}
          />
          <span className="sufijo">{actual.unidadBase}</span>
        </div>
        <div className="chips">
          <button className="chip" onClick={() => setFisico(String(teorico))}>
            Igual al teórico ({cantidad(teorico, actual.unidadBase)})
          </button>
        </div>
      </div>

      {fisicoNum !== null && (
        <div className="filas">
          <div className="fila">
            <span>Teórico (según el sistema)</span>
            <span className="valor">{cantidad(teorico, actual.unidadBase)}</span>
          </div>
          <div className="fila">
            <span>Físico (lo que contaste)</span>
            <span className="valor">{cantidad(fisicoNum, actual.unidadBase)}</span>
          </div>
          <div className="fila total">
            <span>Descuadre</span>
            <span className={`valor ${clase}`}>
              {descuadre > 0 ? '+' : ''}
              {cantidad(descuadre, actual.unidadBase)}
            </span>
          </div>
        </div>
      )}

      <div className="campo">
        <label htmlFor="nota">Nota (opcional)</label>
        <input
          id="nota"
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="p. ej. se mojó una bolsa"
        />
      </div>
    </Screen>
  );
}
