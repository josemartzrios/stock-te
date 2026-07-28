import { useMemo, useState } from 'react';
import type { ConfigGlobal, Insumo } from '../domain';
import { guardarCapacidadObjetivo, guardarInsumo } from '../db/db';
import { Screen } from './Screen';
import { IconAlerta } from './Icons';

interface Props {
  insumos: Insumo[];
  config: ConfigGlobal;
  onGuardado: (msg: string) => void;
  onVolver: () => void;
}

type Campos = { consumoPorLote: string; presentacionPrecio: string; umbralLotes: string };

const inicial = (i: Insumo): Campos => ({
  consumoPorLote: String(i.consumoPorLote),
  presentacionPrecio: String(i.presentacionPrecio),
  umbralLotes: String(i.umbralLotes),
});

/** Numero valido y no negativo; si no, se conserva el valor anterior. */
function num(v: string, previo: number): number {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : previo;
}

export function ConfigScreen({ insumos, config, onGuardado, onVolver }: Props) {
  const [ed, setEd] = useState<Record<string, Campos>>(() =>
    Object.fromEntries(insumos.map((i) => [i.id, inicial(i)])),
  );
  const [capacidad, setCapacidad] = useState(String(config.capacidadObjetivo));
  const [guardando, setGuardando] = useState(false);

  const cambios = useMemo(() => {
    if (num(capacidad, config.capacidadObjetivo) !== config.capacidadObjetivo) return true;
    return insumos.some((i) => {
      const c = ed[i.id];
      return (
        num(c.consumoPorLote, i.consumoPorLote) !== i.consumoPorLote ||
        num(c.presentacionPrecio, i.presentacionPrecio) !== i.presentacionPrecio ||
        num(c.umbralLotes, i.umbralLotes) !== i.umbralLotes
      );
    });
  }, [ed, capacidad, insumos, config.capacidadObjetivo]);

  function editar(id: string, campo: keyof Campos, valor: string) {
    setEd((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  }

  async function guardar() {
    setGuardando(true);
    for (const i of insumos) {
      const c = ed[i.id];
      await guardarInsumo({
        ...i,
        consumoPorLote: num(c.consumoPorLote, i.consumoPorLote),
        presentacionPrecio: num(c.presentacionPrecio, i.presentacionPrecio),
        umbralLotes: num(c.umbralLotes, i.umbralLotes),
      });
    }
    await guardarCapacidadObjetivo(Math.max(1, num(capacidad, config.capacidadObjetivo)));
    onGuardado('Configuración guardada');
  }

  return (
    <Screen
      titulo="Configuración"
      descripcion="Receta, precios vigentes y cuándo avisarte."
      onVolver={onVolver}
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando || !cambios}>
          {cambios ? 'Guardar cambios' : 'Sin cambios'}
        </button>
      }
    >
      <div className="tarjeta">
        <h3>Objetivo de compra</h3>
        <div className="config-fila">
          <label htmlFor="cap">Lotes que quieres poder producir después de surtirte</label>
          <div className="entrada con-sufijo">
            <input
              id="cap"
              type="number"
              inputMode="numeric"
              min={1}
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
            <span className="sufijo">lotes</span>
          </div>
        </div>
      </div>

      <div className="aviso">
        <IconAlerta size={18} />
        <span>
          Cambiar la receta solo afecta producciones futuras. El historial no se recalcula.
        </span>
      </div>

      {insumos.map((i) => (
        <div key={i.id} className="tarjeta">
          <h3>{i.nombre}</h3>

          <div className="config-fila">
            <label htmlFor={`receta-${i.id}`}>Receta: cuánto lleva un lote</label>
            <div className="entrada con-sufijo">
              <input
                id={`receta-${i.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={ed[i.id].consumoPorLote}
                onChange={(e) => editar(i.id, 'consumoPorLote', e.target.value)}
              />
              <span className="sufijo">{i.unidadBase}</span>
            </div>
          </div>

          <div className="config-fila">
            <label htmlFor={`precio-${i.id}`}>Precio vigente por {i.presentacionNombre}</label>
            <div className="entrada con-prefijo">
              <span className="prefijo">$</span>
              <input
                id={`precio-${i.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={ed[i.id].presentacionPrecio}
                onChange={(e) => editar(i.id, 'presentacionPrecio', e.target.value)}
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
                value={ed[i.id].umbralLotes}
                onChange={(e) => editar(i.id, 'umbralLotes', e.target.value)}
              />
              <span className="sufijo">lotes</span>
            </div>
          </div>
        </div>
      ))}
    </Screen>
  );
}
