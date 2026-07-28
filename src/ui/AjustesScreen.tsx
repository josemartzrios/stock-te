import { Screen } from './Screen';
import { IconAjustes, IconChevron, IconExportar } from './Icons';
import type { Tema } from './tema';
import { plural } from './format';

interface Props {
  numInsumos: number;
  numMovimientos: number;
  tema: Tema;
  onTema: (t: Tema) => void;
  onConfig: () => void;
  onRespaldo: () => void;
}

const TEMAS: { id: Tema; texto: string }[] = [
  { id: 'auto', texto: 'Automático' },
  { id: 'claro', texto: 'Claro' },
  { id: 'oscuro', texto: 'Oscuro' },
];

export function AjustesScreen({
  numInsumos,
  numMovimientos,
  tema,
  onTema,
  onConfig,
  onRespaldo,
}: Props) {
  return (
    <Screen titulo="Ajustes">
      <div className="menu-lista">
        <button onClick={onConfig}>
          <span className="marca">
            <IconAjustes size={19} />
          </span>
          <span className="cuerpo">
            Configuración
            <span>Receta, precios y umbrales de alerta</span>
          </span>
          <IconChevron size={19} className="flecha" />
        </button>
        <button onClick={onRespaldo}>
          <span className="marca">
            <IconExportar size={19} />
          </span>
          <span className="cuerpo">
            Respaldo
            <span>Exportar o importar todos tus datos</span>
          </span>
          <IconChevron size={19} className="flecha" />
        </button>
      </div>

      <div className="seccion">
        <h3>Apariencia</h3>
      </div>

      <div className="segmentado" role="group" aria-label="Apariencia">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            className={tema === t.id ? 'sel' : ''}
            aria-pressed={tema === t.id}
            onClick={() => onTema(t.id)}
          >
            {t.texto}
          </button>
        ))}
      </div>

      <div className="seccion">
        <h3>Tus datos</h3>
      </div>

      <div className="filas">
        <div className="fila">
          <span>Insumos en el catálogo</span>
          <span className="valor">{numInsumos}</span>
        </div>
        <div className="fila">
          <span>
            {plural(numMovimientos, 'Movimiento registrado', 'Movimientos registrados')}
          </span>
          <span className="valor">{numMovimientos}</span>
        </div>
        <div className="fila">
          <span>
            Dónde viven
            <span className="sub">Solo en este dispositivo, sin servidor ni cuenta</span>
          </span>
        </div>
      </div>

      <p className="ayuda" style={{ textAlign: 'center' }}>
        Exporta un respaldo de vez en cuando: si borras la app, los datos se van con ella.
      </p>
    </Screen>
  );
}
