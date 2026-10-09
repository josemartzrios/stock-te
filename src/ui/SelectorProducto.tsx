import type { Producto } from '../domain';

interface Props {
  productos: Producto[];
  valor: string;
  onCambiar: (productoId: string) => void;
}

/** Control segmentado para elegir producto (producir y configurar recetas). */
export function SelectorProducto({ productos, valor, onCambiar }: Props) {
  return (
    <div className="chips selector" role="group" aria-label="Producto">
      {productos.map((p) => (
        <button
          key={p.id}
          className={`chip${p.id === valor ? ' sel' : ''}`}
          onClick={() => onCambiar(p.id)}
          aria-pressed={p.id === valor}
        >
          {p.nombre}
        </button>
      ))}
    </div>
  );
}
