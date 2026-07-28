import { IconAjustes, IconCasa, IconHistorial } from './Icons';

export type Tab = 'inicio' | 'historial' | 'ajustes';

interface Props {
  actual: Tab;
  onCambiar: (t: Tab) => void;
  /** Punto de aviso sobre Inicio cuando hay insumos bajo umbral. */
  alerta?: boolean;
}

const TABS: { id: Tab; texto: string; Icono: typeof IconCasa }[] = [
  { id: 'inicio', texto: 'Inicio', Icono: IconCasa },
  { id: 'historial', texto: 'Historial', Icono: IconHistorial },
  { id: 'ajustes', texto: 'Ajustes', Icono: IconAjustes },
];

/** Navegacion principal al alcance del pulgar (reemplaza el menu hamburguesa). */
export function TabBar({ actual, onCambiar, alerta }: Props) {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map(({ id, texto, Icono }) => (
        <button
          key={id}
          className={`tab${actual === id ? ' activa' : ''}`}
          onClick={() => onCambiar(id)}
          aria-current={actual === id ? 'page' : undefined}
        >
          <Icono size={23} />
          <span>{texto}</span>
          {id === 'inicio' && alerta && actual !== 'inicio' && (
            <i className="punto" aria-label="Hay insumos por comprar" />
          )}
        </button>
      ))}
    </nav>
  );
}
