import { useMemo, useState } from 'react';
import type { AlmacenRepositorio, Insumo, Producto } from '../domain';
import { Screen } from './Screen';
import { SelectorProducto } from './SelectorProducto';
import { RecetaEditor, type BorradorProducto } from './RecetaEditor';
import { InsumoEditor, type BorradorInsumo } from './InsumoEditor';
import { IconAlerta } from './Icons';
import { num } from './campos';

interface Props {
  repo: AlmacenRepositorio;
  insumos: Insumo[];
  productos: Producto[];
  onGuardado: (msg: string) => void;
  onVolver: () => void;
}

const borradorProducto = (p: Producto): BorradorProducto => ({
  receta: Object.fromEntries(Object.entries(p.receta).map(([id, q]) => [id, String(q)])),
  objetivoLotes: String(p.objetivoLotes),
});

const borradorInsumo = (i: Insumo): BorradorInsumo => ({
  presentacionNombre: i.presentacionNombre,
  presentacionCantidad: String(i.presentacionCantidad),
  presentacionPrecio: String(i.presentacionPrecio),
  umbralLotes: String(i.umbralLotes),
});

/** Aplica el borrador al producto. Cantidades en 0 o vacias = el insumo no lleva. */
function aplicarProducto(p: Producto, b: BorradorProducto, activos: Insumo[]): Producto {
  const receta = { ...p.receta };
  for (const i of activos) {
    const q = num(b.receta[i.id] ?? '', 0);
    if (q > 0) receta[i.id] = q;
    else delete receta[i.id];
  }
  return { ...p, receta, objetivoLotes: Math.max(1, num(b.objetivoLotes, p.objetivoLotes)) };
}

function aplicarInsumo(i: Insumo, b: BorradorInsumo): Insumo {
  return {
    ...i,
    presentacionNombre: b.presentacionNombre.trim() || i.presentacionNombre,
    presentacionCantidad: num(b.presentacionCantidad, i.presentacionCantidad) || i.presentacionCantidad,
    presentacionPrecio: num(b.presentacionPrecio, i.presentacionPrecio),
    umbralLotes: num(b.umbralLotes, i.umbralLotes),
  };
}

const distinto = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

export function ConfigScreen({ repo, insumos, productos, onGuardado, onVolver }: Props) {
  const activos = useMemo(() => insumos.filter((i) => i.activo), [insumos]);
  const [productoId, setProductoId] = useState(productos[0]?.id ?? '');
  const [bProductos, setBProductos] = useState(() =>
    Object.fromEntries(productos.map((p) => [p.id, borradorProducto(p)])),
  );
  const [bInsumos, setBInsumos] = useState(() =>
    Object.fromEntries(insumos.map((i) => [i.id, borradorInsumo(i)])),
  );
  const [guardando, setGuardando] = useState(false);

  const productosNuevos = useMemo(
    () => productos.map((p) => aplicarProducto(p, bProductos[p.id], activos)),
    [productos, bProductos, activos],
  );
  const insumosNuevos = useMemo(
    () => insumos.map((i) => aplicarInsumo(i, bInsumos[i.id])),
    [insumos, bInsumos],
  );
  const productosCambiados = productosNuevos.filter((p, k) => distinto(p, productos[k]));
  const insumosCambiados = insumosNuevos.filter((i, k) => distinto(i, insumos[k]));
  const cambios = productosCambiados.length + insumosCambiados.length > 0;

  const seleccionado = productos.find((p) => p.id === productoId) ?? productos[0];

  async function guardar() {
    setGuardando(true);
    for (const p of productosCambiados) await repo.guardarProducto(p);
    for (const i of insumosCambiados) await repo.guardarInsumo(i);
    onGuardado('Configuración guardada');
  }

  return (
    <Screen
      titulo="Configuración"
      descripcion="Recetas, precios vigentes y cuándo avisarte."
      onVolver={onVolver}
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando || !cambios}>
          {cambios ? 'Guardar cambios' : 'Sin cambios'}
        </button>
      }
    >
      <div className="aviso">
        <IconAlerta size={18} />
        <span>
          Cambiar la receta solo afecta producciones futuras. El historial no se recalcula.
        </span>
      </div>

      {seleccionado && (
        <>
          <SelectorProducto productos={productos} valor={seleccionado.id} onCambiar={setProductoId} />
          <RecetaEditor
            insumos={activos}
            borrador={bProductos[seleccionado.id]}
            onReceta={(insumoId, valor) =>
              setBProductos((prev) => ({
                ...prev,
                [seleccionado.id]: {
                  ...prev[seleccionado.id],
                  receta: { ...prev[seleccionado.id].receta, [insumoId]: valor },
                },
              }))
            }
            onObjetivo={(valor) =>
              setBProductos((prev) => ({
                ...prev,
                [seleccionado.id]: { ...prev[seleccionado.id], objetivoLotes: valor },
              }))
            }
          />
        </>
      )}

      {insumos.map((i) => (
        <InsumoEditor
          key={i.id}
          insumo={i}
          borrador={bInsumos[i.id]}
          onCambio={(campo, valor) =>
            setBInsumos((prev) => ({ ...prev, [i.id]: { ...prev[i.id], [campo]: valor } }))
          }
        />
      ))}
    </Screen>
  );
}
