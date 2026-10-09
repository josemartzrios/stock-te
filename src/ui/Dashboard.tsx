import type { EstadoInsumo, EstadoProducto } from '../domain';
import { Screen } from './Screen';
import { ProductoCard } from './ProductoCard';
import { cantidad, plural } from './format';
import { IconAlerta, IconCarrito, IconChevron, IconConteo, IconRayo } from './Icons';

interface Props {
  productos: EstadoProducto[];
  insumos: EstadoInsumo[];
  sinMovimientos: boolean;
  onProduje: (productoId: string) => void;
  onCompre: (insumoId?: string) => void;
  onConte: () => void;
  onComprar: () => void;
}

export function Dashboard({
  productos,
  insumos,
  sinMovimientos,
  onProduje,
  onCompre,
  onConte,
  onComprar,
}: Props) {
  const porComprar = insumos.filter((e) => e.necesitaCompra).length;
  const hayQueComprar = porComprar > 0;
  const meta = Math.max(1, ...productos.map((p) => p.producto.objetivoLotes));

  return (
    <Screen titulo="Almacén Té" compacto>
      {productos.map((p) => (
        <ProductoCard key={p.producto.id} estado={p} onProduje={onProduje} />
      ))}

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
          const llenado = e.lotes === null ? 0 : Math.min(e.lotes / meta, 1) * 100;
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
                    : e.lotes === null
                      ? 'Sin uso en recetas'
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
