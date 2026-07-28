import { useEffect, useMemo, useState } from 'react';
import { calcularEstado, calcularSugerencia } from './domain';
import { useDatos } from './hooks/useDatos';
import { Dashboard } from './ui/Dashboard';
import { ProduceScreen } from './ui/ProduceScreen';
import { CompraScreen } from './ui/CompraScreen';
import { ConteoScreen } from './ui/ConteoScreen';
import { SugerenciaScreen } from './ui/SugerenciaScreen';
import { AjustesScreen } from './ui/AjustesScreen';
import { HistorialScreen } from './ui/HistorialScreen';
import { ConfigScreen } from './ui/ConfigScreen';
import { RespaldoScreen } from './ui/RespaldoScreen';
import { TabBar, type Tab } from './ui/TabBar';
import { IconCheck } from './ui/Icons';
import { useTema } from './ui/tema';

type Vista =
  | { t: Tab }
  | { t: 'produje' }
  | { t: 'compre'; insumoId?: string }
  | { t: 'conte' }
  | { t: 'sugerencia' }
  | { t: 'config' }
  | { t: 'respaldo' };

const TABS: Tab[] = ['inicio', 'historial', 'ajustes'];
const esTab = (v: Vista): v is { t: Tab } => TABS.includes(v.t as Tab);

export function App() {
  const { datos, cargando, recargar } = useDatos();
  const [vista, setVista] = useState<Vista>({ t: 'inicio' });
  const [toast, setToast] = useState<string | null>(null);
  const [tema, setTema] = useTema();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Cada cambio de pantalla arranca arriba, como en una app nativa.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [vista.t]);

  const estado = useMemo(
    () => (datos ? calcularEstado(datos.insumos, datos.movimientos) : null),
    [datos],
  );
  const sugerencia = useMemo(
    () => (datos ? calcularSugerencia(datos.insumos, datos.movimientos, datos.config) : null),
    [datos],
  );

  async function trasGuardar(msg: string, destino: Vista = { t: 'inicio' }) {
    await recargar();
    setToast(msg);
    setVista(destino);
  }

  if (cargando || !datos || !estado || !sugerencia) return <Esqueleto />;

  const conTabs = esTab(vista);

  return (
    <>
      <div className={`app${conTabs ? ' con-tabs' : ''}`}>
        {vista.t === 'inicio' && (
          <Dashboard
            estado={estado}
            objetivo={datos.config.capacidadObjetivo}
            sinMovimientos={datos.movimientos.length === 0}
            onProduje={() => setVista({ t: 'produje' })}
            onCompre={(insumoId) => setVista({ t: 'compre', insumoId })}
            onConte={() => setVista({ t: 'conte' })}
            onComprar={() => setVista({ t: 'sugerencia' })}
          />
        )}

        {vista.t === 'historial' && (
          <HistorialScreen insumos={datos.insumos} movimientos={datos.movimientos} />
        )}

        {vista.t === 'ajustes' && (
          <AjustesScreen
            numInsumos={datos.insumos.length}
            numMovimientos={datos.movimientos.length}
            tema={tema}
            onTema={setTema}
            onConfig={() => setVista({ t: 'config' })}
            onRespaldo={() => setVista({ t: 'respaldo' })}
          />
        )}

        {vista.t === 'produje' && (
          <ProduceScreen
            insumos={datos.insumos}
            movimientos={datos.movimientos}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'compre' && (
          <CompraScreen
            insumos={datos.insumos}
            movimientos={datos.movimientos}
            insumoId={vista.insumoId}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'conte' && (
          <ConteoScreen
            insumos={datos.insumos}
            movimientos={datos.movimientos}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'sugerencia' && (
          <SugerenciaScreen
            sugerencia={sugerencia}
            onCancelar={() => setVista({ t: 'inicio' })}
            onIrACompra={(insumoId) => setVista({ t: 'compre', insumoId })}
          />
        )}

        {vista.t === 'config' && (
          <ConfigScreen
            insumos={datos.insumos}
            config={datos.config}
            onGuardado={(m) => trasGuardar(m, { t: 'ajustes' })}
            onVolver={() => setVista({ t: 'ajustes' })}
          />
        )}

        {vista.t === 'respaldo' && (
          <RespaldoScreen
            onImportado={(m) => trasGuardar(m, { t: 'inicio' })}
            onVolver={() => setVista({ t: 'ajustes' })}
          />
        )}
      </div>

      {conTabs && (
        <TabBar
          actual={vista.t}
          onCambiar={(t) => setVista({ t })}
          alerta={estado.hayQueComprar}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <IconCheck size={18} />
          {toast}
        </div>
      )}
    </>
  );
}

function Esqueleto() {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando inventario">
      <div className="hueso" style={{ height: 20, width: 130, marginBottom: 20 }} />
      <div className="hueso" style={{ height: 186, marginBottom: 14 }} />
      <div className="hueso" style={{ height: 86, marginBottom: 14 }} />
      <div className="hueso" style={{ height: 62, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 62, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 62 }} />
    </div>
  );
}
