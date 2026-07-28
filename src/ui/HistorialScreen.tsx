import { useMemo, useState } from 'react';
import type { Insumo, MovimientoRegistro } from '../domain';
import { ordenarLog } from '../domain';
import { Screen } from './Screen';
import { cantidad, claveDia, etiquetaDia, hora, money, plural } from './format';
import { IconBotella, IconCarrito, IconConteo, IconHistorial } from './Icons';

interface Props {
  insumos: Insumo[];
  movimientos: MovimientoRegistro[];
}

type Filtro = 'todo' | 'produccion' | 'compra' | 'ajuste';

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: 'todo', texto: 'Todo' },
  { id: 'produccion', texto: 'Producción' },
  { id: 'compra', texto: 'Compras' },
  { id: 'ajuste', texto: 'Conteos' },
];

const ICONO = {
  produccion: IconBotella,
  compra: IconCarrito,
  ajuste: IconConteo,
} as const;

export function HistorialScreen({ insumos, movimientos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todo');

  const nombre = (id: string) => insumos.find((i) => i.id === id)?.nombre ?? id;
  const unidad = (id: string) => insumos.find((i) => i.id === id)?.unidadBase ?? '';

  // Cronologico inverso y agrupado por dia, para poder leerlo como una bitacora.
  const dias = useMemo(() => {
    const filtrados = ordenarLog(movimientos)
      .reverse()
      .filter((r) => filtro === 'todo' || r.mov.tipo === filtro);

    const grupos: { clave: string; items: MovimientoRegistro[] }[] = [];
    for (const r of filtrados) {
      const clave = claveDia(r.timestamp);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clave === clave) ultimo.items.push(r);
      else grupos.push({ clave, items: [r] });
    }
    return grupos;
  }, [movimientos, filtro]);

  const total = dias.reduce((n, g) => n + g.items.length, 0);

  return (
    <Screen
      titulo="Historial"
      descripcion="Cada movimiento queda registrado y no se puede editar."
    >
      <div className="filtros" role="tablist" aria-label="Filtrar movimientos">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filtro === f.id}
            className={`chip${filtro === f.id ? ' sel' : ''}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.texto}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="vacio">
          <span className="marca">
            <IconHistorial size={26} />
          </span>
          <b>Sin movimientos</b>
          <p>
            {filtro === 'todo'
              ? 'Cuando registres una producción, compra o conteo aparecerá aquí.'
              : 'No hay movimientos de este tipo todavía.'}
          </p>
        </div>
      ) : (
        dias.map((g) => (
          <div key={g.clave}>
            <div className="dia">{etiquetaDia(g.clave)}</div>
            {g.items.map((r) => {
              const Icono = ICONO[r.mov.tipo];
              return (
                <article key={r.id} className={`evento ${r.mov.tipo}`}>
                  <span className="marca">
                    <Icono size={19} />
                  </span>
                  <div className="cuerpo">
                    {r.mov.tipo === 'compra' && (
                      <>
                        <div className="que">
                          <span>Compra · {nombre(r.mov.insumoId)}</span>
                          <span className="hora">{hora(r.timestamp)}</span>
                        </div>
                        <div className="detalle">
                          <span className="tag-pos">
                            +{cantidad(r.mov.cantidad, unidad(r.mov.insumoId))}
                          </span>
                          {r.mov.presentaciones !== undefined &&
                            r.mov.presentacionCantidad !== undefined &&
                            ` · ${r.mov.presentaciones} × ${cantidad(
                              r.mov.presentacionCantidad,
                              unidad(r.mov.insumoId),
                            )}`}
                          {r.mov.costoTotal !== undefined && ` · ${money(r.mov.costoTotal)}`}
                        </div>
                      </>
                    )}

                    {r.mov.tipo === 'produccion' && (
                      <>
                        <div className="que">
                          <span>
                            Producción · {r.mov.lotes} {plural(r.mov.lotes, 'lote', 'lotes')}
                          </span>
                          <span className="hora">{hora(r.timestamp)}</span>
                        </div>
                        <div className="detalle">
                          {Object.entries(r.mov.descuentos)
                            .map(([id, q]) => `${nombre(id)} −${cantidad(q, unidad(id))}`)
                            .join(' · ')}
                        </div>
                      </>
                    )}

                    {r.mov.tipo === 'ajuste' && (
                      <>
                        <div className="que">
                          <span>Conteo · {nombre(r.mov.insumoId)}</span>
                          <span className="hora">{hora(r.timestamp)}</span>
                        </div>
                        <div className="detalle">
                          Físico {cantidad(r.mov.stockFisico, unidad(r.mov.insumoId))} · descuadre{' '}
                          <span className={r.mov.descuadre < 0 ? 'tag-neg' : 'tag-pos'}>
                            {r.mov.descuadre > 0 ? '+' : ''}
                            {cantidad(r.mov.descuadre, unidad(r.mov.insumoId))}
                          </span>
                        </div>
                        {r.mov.nota && <div className="nota">“{r.mov.nota}”</div>}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ))
      )}
    </Screen>
  );
}
