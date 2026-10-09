import { useMemo, useState } from 'react';
import type { AlmacenRepositorio, Insumo, MovimientoRegistro, Producto } from '../domain';
import {
  armarProduccion,
  calcularDescuentos,
  calcularStocks,
  lotesRestantes,
  ultimosLotes,
} from '../domain';
import { Screen } from './Screen';
import { SelectorProducto } from './SelectorProducto';
import { cantidad, plural } from './format';
import { IconAlerta, IconMas, IconMenos } from './Icons';

interface Props {
  repo: AlmacenRepositorio;
  insumos: Insumo[];
  productos: Producto[];
  movimientos: MovimientoRegistro[];
  productoIdInicial: string;
  onGuardado: (msg: string) => void;
  onCancelar: () => void;
}

const ATAJOS = [1, 2, 3, 4, 6];
const MAX = 20;

export function ProduceScreen({
  repo,
  insumos,
  productos,
  movimientos,
  productoIdInicial,
  onGuardado,
  onCancelar,
}: Props) {
  const elegibles = useMemo(() => productos.filter((p) => p.activo), [productos]);
  const [productoId, setProductoId] = useState(productoIdInicial);
  const producto = elegibles.find((p) => p.id === productoId) ?? elegibles[0];
  // Arranca en el ultimo valor usado para ese producto (derivado del log).
  const [lotes, setLotes] = useState(() => ultimosLotes(movimientos, productoIdInicial));
  const [guardando, setGuardando] = useState(false);

  const stocks = useMemo(() => calcularStocks(movimientos), [movimientos]);

  if (!producto) {
    return (
      <Screen titulo="Producir" onVolver={onCancelar} volverLabel="Cancelar">
        <p className="ayuda">No hay productos activos. Agrega uno en Configuración.</p>
      </Screen>
    );
  }

  function elegir(id: string) {
    setProductoId(id);
    setLotes(ultimosLotes(movimientos, id));
  }

  const descuentos = calcularDescuentos(producto, insumos, lotes);

  // Previsualizacion: cuanto queda de cada insumo DESPUES de esta produccion.
  const despues = insumos
    .filter((i) => i.id in descuentos)
    .map((insumo) => {
      const resta = descuentos[insumo.id];
      const queda = (stocks[insumo.id] ?? 0) - resta;
      return { insumo, resta, queda, ...lotesRestantes(queda, producto.receta[insumo.id]) };
    });
  const insuficientes = despues.filter((d) => d.queda < 0);
  const finitos = despues.map((d) => d.lotes).filter(Number.isFinite);
  const lotesDespues = finitos.length ? Math.min(...finitos) : 0;

  async function guardar() {
    setGuardando(true);
    await repo.agregarMovimiento(armarProduccion(producto, insumos, lotes));
    onGuardado(`Registré ${lotes} ${plural(lotes, 'lote', 'lotes')} de ${producto.nombre}`);
  }

  return (
    <Screen
      titulo={producto.nombre}
      descripcion="¿Cuántos lotes produjiste?"
      onVolver={onCancelar}
      volverLabel="Cancelar"
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
          Registrar {lotes} {plural(lotes, 'lote', 'lotes')}
        </button>
      }
    >
      {elegibles.length > 1 && (
        <SelectorProducto productos={elegibles} valor={producto.id} onCambiar={elegir} />
      )}

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
