import { useEffect, useMemo, useState } from 'react';
import {
  calcularEstadoInsumos,
  calcularEstadoProductos,
  calcularStocks,
  calcularSugerencia,
} from './domain';
import { repositorioApp as repo } from './db/repositorioApp';
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
  | { t: 'produje'; productoId?: string }
  | { t: 'compre'; insumoId?: string }
  | { t: 'conte' }
  | { t: 'sugerencia' }
  | { t: 'config' }
  | { t: 'respaldo' };

const TABS: Tab[] = ['inicio', 'historial', 'ajustes'];
const esTab = (v: Vista): v is { t: Tab } => TABS.includes(v.t as Tab);

export function App() {
  const { datos, cargando, error, recargar } = useDatos(repo);
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

  const derivado = useMemo(() => {
    if (!datos) return null;
    const stocks = calcularStocks(datos.movimientos);
    return {
      productos: calcularEstadoProductos(datos.insumos, datos.productos, stocks),
      insumos: calcularEstadoInsumos(datos.insumos, datos.productos, stocks),
      sugerencia: calcularSugerencia(datos.insumos, datos.productos, stocks),
    };
  }, [datos]);

  async function trasGuardar(msg: string, destino: Vista = { t: 'inicio' }) {
    await recargar();
    setToast(msg);
    setVista(destino);
  }

  if (error) return <ErrorDeCarga detalle={error.message} />;
  if (cargando || !datos || !derivado) return <Esqueleto />;

  const conTabs = esTab(vista);

  return (
    <>
      <div className={`app${conTabs ? ' con-tabs' : ''}`}>
        {vista.t === 'inicio' && (
          <Dashboard
            productos={derivado.productos}
            insumos={derivado.insumos}
            sinMovimientos={datos.movimientos.length === 0}
            onProduje={(productoId) => setVista({ t: 'produje', productoId })}
            onCompre={(insumoId) => setVista({ t: 'compre', insumoId })}
            onConte={() => setVista({ t: 'conte' })}
            onComprar={() => setVista({ t: 'sugerencia' })}
          />
        )}

        {vista.t === 'historial' && (
          <HistorialScreen
            insumos={datos.insumos}
            productos={datos.productos}
            movimientos={datos.movimientos}
          />
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
            repo={repo}
            insumos={datos.insumos}
            productos={datos.productos}
            movimientos={datos.movimientos}
            productoIdInicial={vista.productoId ?? datos.productos[0]?.id ?? ''}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'compre' && (
          <CompraScreen
            repo={repo}
            insumos={datos.insumos}
            productos={datos.productos}
            movimientos={datos.movimientos}
            insumoId={vista.insumoId}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'conte' && (
          <ConteoScreen
            repo={repo}
            insumos={datos.insumos}
            movimientos={datos.movimientos}
            onGuardado={trasGuardar}
            onCancelar={() => setVista({ t: 'inicio' })}
          />
        )}

        {vista.t === 'sugerencia' && (
          <SugerenciaScreen
            sugerencia={derivado.sugerencia}
            onCancelar={() => setVista({ t: 'inicio' })}
            onIrACompra={(insumoId) => setVista({ t: 'compre', insumoId })}
          />
        )}

        {vista.t === 'config' && (
          <ConfigScreen
            repo={repo}
            insumos={datos.insumos}
            productos={datos.productos}
            onGuardado={(m) => trasGuardar(m, { t: 'ajustes' })}
            onVolver={() => setVista({ t: 'ajustes' })}
          />
        )}

        {vista.t === 'respaldo' && (
          <RespaldoScreen
            repo={repo}
            onImportado={(m) => trasGuardar(m, { t: 'inicio' })}
            onVolver={() => setVista({ t: 'ajustes' })}
          />
        )}
      </div>

      {conTabs && (
        <TabBar
          actual={vista.t}
          onCambiar={(t) => setVista({ t })}
          alerta={derivado.insumos.some((e) => e.necesitaCompra)}
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

function ErrorDeCarga({ detalle }: { detalle: string }) {
  return (
    <div className="app">
      <div className="vacio" role="alert">
        <b>No se pudo abrir el inventario</b>
        <p>
          Tus datos siguen guardados en este teléfono. No borres ni reinstales la app: cierra
          y vuelve a abrirla, y si sigue igual avísame.
        </p>
        <p className="ayuda">{detalle}</p>
        <button className="btn btn-primario" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    </div>
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
