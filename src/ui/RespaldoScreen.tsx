import { useRef, useState } from 'react';
import { exportarJSON, importarJSON } from '../db/db';
import { Screen } from './Screen';
import { IconAlerta, IconExportar, IconImportar } from './Icons';

interface Props {
  onImportado: (msg: string) => void;
  onVolver: () => void;
}

export function RespaldoScreen({ onImportado, onVolver }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  async function exportar() {
    setError('');
    const data = await exportarJSON();
    const json = JSON.stringify(data, null, 2);
    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = `almacen-te-${fecha}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const file = new File([blob], nombre, { type: 'application/json' });

    // iOS: usa el share sheet si permite compartir archivos
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'Respaldo Almacén Té' });
        return;
      } catch {
        // el usuario canceló el share; caemos a descarga
      }
    }
    // Fallback: descarga directa
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        'Importar REEMPLAZA todos los datos actuales (inventario e historial) por los del archivo. Esta acción no se puede deshacer.\n\n¿Continuar?',
      )
    ) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const texto = await file.text();
      const data = JSON.parse(texto);
      await importarJSON(data);
      onImportado('Respaldo importado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Screen
      titulo="Respaldo"
      descripcion="Tus datos viven solo en este teléfono. Un respaldo es la única forma de recuperarlos si lo pierdes o reinstalas la app."
      onVolver={onVolver}
    >
      <div className="tarjeta">
        <h3>Exportar</h3>
        <p className="ayuda" style={{ margin: '0 0 14px' }}>
          Genera un archivo <b>.json</b> con el catálogo y todo el historial. Guárdalo en Archivos
          o mándatelo por correo.
        </p>
        <button className="btn btn-primario" onClick={exportar}>
          <IconExportar size={20} />
          Exportar respaldo
        </button>
      </div>

      <div className="tarjeta">
        <h3>Importar</h3>
        <div className="aviso">
          <IconAlerta size={18} />
          <span>Reemplaza todo lo que tienes ahora. No se puede deshacer.</span>
        </div>
        <button className="btn btn-peligro" onClick={() => fileRef.current?.click()}>
          <IconImportar size={20} />
          Elegir archivo e importar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={alElegirArchivo}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--rojo)', fontWeight: 600, textAlign: 'center' }}>{error}</p>
      )}
    </Screen>
  );
}
