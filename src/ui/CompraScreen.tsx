import { useMemo, useState } from 'react';
import type { AlmacenRepositorio, Insumo, MovimientoRegistro, Producto } from '../domain';
import { calcularStocks, lotesParaStock } from '../domain';
import { Screen } from './Screen';
import { cantidad, money, plural } from './format';
import { IconCaja, IconChevron, IconHielo, IconMas, IconMenos } from './Icons';

interface Props {
  repo: AlmacenRepositorio;
  insumos: Insumo[];
  productos: Producto[];
  movimientos: MovimientoRegistro[];
  /** Insumo preseleccionado al entrar desde la lista del inicio. */
  insumoId?: string;
  onGuardado: (msg: string) => void;
  onCancelar: () => void;
}

const MAX = 99;

export function CompraScreen({ repo, insumos, productos, movimientos, insumoId, onGuardado, onCancelar }: Props) {
  const activos = useMemo(() => insumos.filter((i) => i.activo), [insumos]);
  // El hielo no se compra: se registra desde su fila en el inicio.
  const comprables = useMemo(() => activos.filter((i) => !i.hechoEnCasa), [activos]);
  const stocks = useMemo(() => calcularStocks(movimientos), [movimientos]);

  const [sel, setSel] = useState<Insumo | null>(
    () => activos.find((i) => i.id === insumoId) ?? null,
  );
  const [pres, setPres] = useState(1);
  const [tam, setTam] = useState(''); // tamano por presentacion; vacio = el del catalogo
  const [tamAbierto, setTamAbierto] = useState(false);
  const [costo, setCosto] = useState('');
  const [costoTocado, setCostoTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Tamano de la presentacion: el del catalogo salvo que hoy se haya comprado
  // otro empaque (promocion, bolsa mas grande, etc.).
  const tamCatalogo = sel?.presentacionCantidad ?? 0;
  const tamNum = Number(tam);
  const tamValido = tam.trim() !== '' && Number.isFinite(tamNum) && tamNum > 0;
  const tamUsado = tamAbierto ? (tamValido ? tamNum : 0) : tamCatalogo;
  const otroTam = tamAbierto && tamValido && tamNum !== tamCatalogo;

  const unidades = pres * tamUsado;
  const precioBase = sel?.presentacionPrecio ?? 0;
  // Si el empaque es otro, el precio del catalogo ya no aplica: se prorratea
  // solo para dar una referencia, nunca para prellenar el costo real.
  const costoReferencia = tamCatalogo > 0 ? (unidades / tamCatalogo) * precioBase : 0;
  const costoSugerido = otroTam ? 0 : pres * precioBase;
  const costoMostrado = costoTocado ? costo : costoSugerido ? costoSugerido.toFixed(2) : '';

  const costoNum = Number(costoMostrado);
  const costoValido = costoMostrado !== '' && Number.isFinite(costoNum) && costoNum >= 0;
  // Cuanto habria costado la presentacion de siempre a este precio: sirve para
  // ver de un vistazo si la promocion realmente conviene.
  const equivalente = costoValido && unidades > 0 ? (costoNum / unidades) * tamCatalogo : 0;

  function elegir(i: Insumo) {
    setSel(i);
    setPres(1);
    setTam('');
    setTamAbierto(false);
    setCosto('');
    setCostoTocado(false);
  }

  function alternarTam() {
    if (tamAbierto) {
      setTamAbierto(false);
      setTam('');
    } else {
      setTamAbierto(true);
      setTam(String(tamCatalogo));
    }
    setCosto('');
    setCostoTocado(false);
  }

  async function guardar() {
    if (!sel) return;
    setGuardando(true);
    const costoTotal = costoValido ? costoNum : undefined;
    await repo.agregarMovimiento({
      tipo: 'compra',
      insumoId: sel.id,
      cantidad: unidades,
      presentaciones: pres,
      presentacionCantidad: tamUsado,
      ...(costoTotal !== undefined ? { costoTotal } : {}),
    });
    onGuardado(sel.hechoEnCasa ? `${sel.nombre} puesto a congelar` : `Compra de ${sel.nombre} registrada`);
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
          {comprables.map((i) => (
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
  const lotesNuevos = lotesParaStock(sel.id, productos, stockNuevo);
  const stepper = (
    <div className="stepper" role="group" aria-labelledby="lbl-pres">
      <button onClick={() => setPres((n) => Math.max(1, n - 1))} disabled={pres <= 1} aria-label="Una menos">
        <IconMenos size={26} />
      </button>
      <span className="valor" aria-live="polite">
        {pres}
      </span>
      <button onClick={() => setPres((n) => Math.min(MAX, n + 1))} disabled={pres >= MAX} aria-label="Una más">
        <IconMas size={26} />
      </button>
    </div>
  );

  // Hecho en casa (hielo): solo cuantas pusiste a congelar. Sin costo ni empaque.
  if (sel.hechoEnCasa) {
    return (
      <Screen
        titulo={sel.nombre}
        descripcion="Lo que acabas de poner a congelar."
        onVolver={onCancelar}
        volverLabel="Cancelar"
        pie={
          <button className="btn btn-primario" onClick={guardar} disabled={guardando || unidades <= 0}>
            Guardar
          </button>
        }
      >
        <div className="campo">
          <label id="lbl-pres">
            <IconHielo size={16} /> ¿Cuántas {sel.unidadBase} pusiste?
          </label>
          {stepper}
          <p className="ayuda">Cuando se acabe, márcalo en Conté (0 {sel.unidadBase}).</p>
        </div>
        <div className="resumen">
          + {cantidad(unidades, sel.unidadBase)} · quedas con {cantidad(stockNuevo, sel.unidadBase)}
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      titulo={sel.nombre}
      descripcion={`Se compra por ${sel.presentacionNombre}.`}
      onVolver={() => setSel(null)}
      volverLabel="Cambiar insumo"
      pie={
        <button className="btn btn-primario" onClick={guardar} disabled={guardando || unidades <= 0}>
          Guardar compra
        </button>
      }
    >
      <div className="campo">
        <label id="lbl-pres">¿Cuántas presentaciones?</label>
        {stepper}
        <p className="ayuda">
          {pres} × {otroTam ? cantidad(tamUsado, sel.unidadBase) : sel.presentacionNombre}
        </p>
      </div>

      {tamAbierto ? (
        <div className="campo">
          <label htmlFor="tam">¿Cuánto trae cada una?</label>
          <div className="entrada con-sufijo">
            <input
              id="tam"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={tam}
              onChange={(e) => setTam(e.target.value)}
            />
            <span className="sufijo">{sel.unidadBase}</span>
          </div>
          <p className="ayuda">
            Solo para esta compra; el catálogo no cambia. Lo de siempre es{' '}
            {sel.presentacionNombre} ({cantidad(tamCatalogo, sel.unidadBase)}).{' '}
            <button className="btn-texto" onClick={alternarTam}>
              Volver a lo de siempre
            </button>
          </p>
        </div>
      ) : (
        <p className="campo-nota">
          <button className="btn-texto" onClick={alternarTam}>
            Hoy compré otro tamaño
          </button>
        </p>
      )}

      <div className="resumen">
        + {cantidad(unidades, sel.unidadBase)}
        {lotesNuevos !== null && (
          <>
            {' '}
            · quedas con {lotesNuevos} {plural(lotesNuevos, 'lote', 'lotes')}
          </>
        )}
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
          {otroTam
            ? `Escribe lo que pagaste. Al precio de siempre esa cantidad costaría ${money(costoReferencia)}.`
            : costoTocado
              ? 'Opcional. Déjalo vacío si no quieres registrarlo.'
              : `Prellenado con el precio vigente: ${pres} × ${money(sel.presentacionPrecio)}. Puedes corregirlo.`}
        </p>
        {otroTam && costoValido && (
          <p className="ayuda">
            Sale a {money(equivalente)} por {sel.presentacionNombre}, contra{' '}
            {money(sel.presentacionPrecio)} de siempre.
          </p>
        )}
      </div>
    </Screen>
  );
}
