# Productos: té con azúcar morena y té con stevia — Diseño

Fecha: 2026-10-08 · Ruta: arquitectural

## 1. Objetivo

La app hoy modela un solo producto: una receta global (`Insumo.consumoPorLote`)
y producir descuenta todos los insumos. El negocio pasa a producir **dos
productos** con insumos parcialmente compartidos:

| Insumo (por lote) | Té morena | Té stevia |
|---|---|---|
| Té oolong | 150 g | 150 g |
| Limón deshidratado | 22 g | 22 g |
| Botella PET / Tapa | 18 pzas c/u | 18 pzas c/u |
| Agua | 9.5 L | 10 L (en prueba; antes 9 L) |
| Azúcar morena | 800 g | — |
| Stevia (líquida) | — | 30 ml |

Criterios de éxito:
- Registrar una producción de cualquier producto con el mínimo de toques.
- Producir un producto descuenta los insumos compartidos, por lo que baja el
  stock disponible del otro; los insumos exclusivos solo afectan a su producto.
- Dashboard con lotes **por producto**, cada uno con su cuello de botella.
- Sugerencia de compra para una mezcla objetivo de **3 lotes de cada producto**.
- Recetas editables por producto (aún no están estandarizadas) sin alterar el
  historial.
- Agregar un tercer producto (p. ej. té sin azúcar) = datos, no código.
- Ningún dato existente se pierde; el stock histórico no cambia.

Fuera de alcance: deshacer eventos (el log es inmutable; se corrige con conteo),
costeo de utilidad por producto, multiusuario.

## 2. Modelo de datos

```ts
interface Producto {
  id: string;            // 'morena' | 'stevia' | ...
  nombre: string;
  receta: Record<string, number>; // insumoId -> cantidad (unidadBase) por lote
  objetivoLotes: number; // lotes de este producto a cubrir al comprar (3)
  activo: boolean;
}
```

- `Insumo` pierde `consumoPorLote`. Queda como catálogo de stock y compra
  (unidad, presentación, precio, `umbralLotes`).
- Insumo nuevo `stevia`: unidad `ml`, presentación "frasco 65 ml", 65, $58.
  Tamaño y precio editables para pasar al formato grande.
- `Movimiento` de producción gana `productoId`. Eventos previos sin el campo
  se leen como `'morena'`. El stock sigue saliendo únicamente del snapshot
  `descuentos`; el log nunca se reescribe.
- `ConfigGlobal.capacidadObjetivo` desaparece; lo reemplaza
  `Producto.objetivoLotes`.
- Semilla: `morena` con los valores actuales de catálogo, `stevia` con la tabla
  de arriba, ambos con objetivo 3.

### Migración (Dexie v2)
- Nueva tabla `productos`.
- `upgrade`: crea `morena` leyendo el `consumoPorLote` actual de cada insumo
  (respeta valores ya editados), crea `stevia` copiando esa receta, quitando
  azúcar, agregando stevia 30 ml y agua 10 L; agrega el insumo `stevia`;
  guarda `objetivoLotes = 3`; elimina `consumoPorLote` de los insumos.
- Respaldos JSON v1 se aceptan al importar y se migran en memoria; los
  exportados nuevos son v2.

## 3. Dominio (funciones puras)

Separación por responsabilidad (SRP); sin dependencias de UI ni de Dexie:

| Módulo | Responsabilidad |
|---|---|
| `types/insumo.ts`, `producto.ts`, `movimiento.ts` | Tipos |
| `stock.ts` | Reducer del log → stock por insumo |
| `receta.ts` | `calcularDescuentos(producto, lotes)` desde la receta |
| `estadoProducto.ts` | Por producto: lotes, cuello de botella, semáforo |
| `sugerencia.ts` | Sugerencia de compra mezclada |
| `repositorio.ts` | Interfaz `AlmacenRepositorio` |

Reglas:
- **Lotes de un producto** = mínimo de `floor(stock / receta[insumo])` sobre
  los insumos de su receta. Cada producto se evalúa contra el mismo stock (no
  se suman): significa "con lo que hay, podrías hacer N solo de este".
- **Semáforo** por producto: rojo si 0 lotes o negativo; amarillo si algún
  insumo de la receta tiene lotes ≤ `umbralLotes`; verde en otro caso.
- **Sugerencia**: `requerido(insumo) = Σ objetivoLotes(p) × receta(p)[insumo]`
  sobre productos activos que usan el insumo. `faltante = requerido − stock`;
  presentaciones = `ceil(faltante / presentacionCantidad)`. Un insumo entra si
  su stock da ≤ `umbralLotes` para algún producto que lo usa. Compartidos
  suman ambos consumos (p. ej. té: 3×150 + 3×150 = 900 g).
- Stock negativo se tolera igual que hoy (0 lotes, bandera, sin bloquear).

## 4. Persistencia y dependencias

- `AlmacenRepositorio` (en dominio): `leerTodo`, `agregarMovimiento`,
  `guardarInsumo`, `guardarProducto`. Las pantallas y `useDatos` dependen de la
  interfaz, no de Dexie (DIP); en pruebas se usa una implementación en memoria.
- `db/` se divide en `esquema.ts` (Dexie + versiones), `migraciones.ts`,
  `repositorioDexie.ts`, `respaldo.ts`.
- `App.tsx` crea el repositorio y lo entrega vía hook/contexto; deja de
  importar `db` directo en las pantallas.

## 5. UI / UX (menos toques, mejores prácticas)

Línea base hoy: producir = Inicio → "Produje" → lotes → Registrar (3 toques).

- **Dashboard**: una tarjeta por producto (nombre, lotes que alcanza, cuello de
  botella, segmentos hacia su objetivo, semáforo) con su propio botón
  **Produje** dentro de la tarjeta. El producto llega preseleccionado: no hay
  selector que tocar. Producir sigue en 3 toques, sin elegir producto.
- **Producir**: título con el producto; el selector de producto sigue
  disponible como control segmentado (por si se entró desde otro lado). El
  número de lotes arranca en el **último valor usado para ese producto**
  (derivado del log, sin estado extra). Vista previa de lo que se descuenta y
  aviso de negativo se conservan.
- **Insumos compartidos**: la lista de insumos del Dashboard se mantiene; cada
  fila muestra stock y el semáforo del peor caso entre los productos que lo
  usan; tocar una fila abre "Compré" ya con ese insumo (igual que hoy).
- **Qué comprar**: lista única mezclada 3+3, con el total; cada línea abre
  "Compré" con el insumo y cantidad sugerida precargados.
- **Configuración**: control segmentado por producto para editar su receta y
  objetivo; precios/umbrales de insumos aparte. Campos numéricos con teclado
  numérico (`inputMode="decimal"`), etiquetas con unidad visible (g, ml, L).
  Una receta nueva de prueba (agua 10 L) se cambia en un campo, sin pasos extra.
- **Generales**: objetivos táctiles ≥ 44 px; la acción principal siempre al
  alcance del pulgar (pie fijo); estados vacío/cargando existentes se
  conservan; texto con contraste suficiente en ambos temas; etiquetas ARIA por
  producto; confirmación por toast, sin diálogos modales extra.

## 6. Pruebas

Reescribir `calc.test.ts` / `fixture.test.ts` por módulo y agregar:
- Producir morena baja té/agua/limón/PET/tapa compartidos y no toca stevia;
  producir stevia no toca azúcar morena.
- Lotes y cuello de botella por producto con stock compartido.
- Sugerencia 3+3: té suma 900 g; azúcar solo del objetivo de morena; stevia
  solo del de stevia; redondeo a presentaciones completas.
- Migración: un log v1 produce exactamente el mismo stock que antes; recetas
  editadas se conservan; respaldo v1 importa correctamente.
- Receta editada después de una producción no cambia el stock histórico.
- Repositorio en memoria cumple el mismo contrato que el de Dexie.
