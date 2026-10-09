# Productos morena y stevia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app maneja dos productos (té con azúcar morena y té con stevia) con recetas propias, stock compartido, dashboard y sugerencia de compra por producto.

**Architecture:** La receta pasa de `Insumo.consumoPorLote` a `Producto.receta`. El dominio es un conjunto de módulos puros (stock, receta, estadoProducto, sugerencia, migración, respaldo). La persistencia se abstrae en `AlmacenRepositorio` (Dexie en producción, memoria en pruebas) y la UI lo recibe por props. El log de movimientos sigue siendo inmutable.

**Tech Stack:** TypeScript, React 18, Dexie 4, Vite, Vitest (+ `fake-indexeddb` como devDependency para probar Dexie).

**Spec:** `docs/superpowers/specs/2026-10-08-productos-morena-stevia-design.md`

## Global Constraints

- Idioma del código, tipos y textos de UI: español (es-MX), igual que el código existente.
- Unidades base: `g`, `ml`, `pza`, `L`. Stock solo se deriva del log; nunca se edita ni se borra un movimiento.
- Recetas semilla (por lote). `morena`: te 150, azucar 800, limon 22, pet 18, tapa 18, agua 9.5. `stevia`: te 150, stevia 30, limon 22, pet 18, tapa 18, agua 10. `objetivoLotes` = 3 en ambos.
- Insumo nuevo `stevia`: nombre "Stevia líquida", unidad `ml`, presentación "frasco 65 ml", cantidad 65, precio 58, umbral 2.
- Evento de producción: `productoId` opcional en el tipo; ausente se lee como `'morena'` (`ID_PRODUCTO_LEGADO`). Todo evento nuevo lo trae.
- El stock usa SIEMPRE el snapshot `descuentos` del evento, nunca la receta vigente.
- Dexie: versión 2; tabla nueva `productos`; tabla `config` se elimina. Respaldos: `version: 2`; los de `version: 1` se aceptan y migran.
- UI: objetivos táctiles ≥ 44 px, `inputMode="decimal"` en campos numéricos con la unidad visible, sin diálogos modales nuevos, confirmación por toast, producir sigue en 3 toques.
- `vitest` no hace typecheck. Entre las tareas 1 y 8 `npm run build` fallará en archivos de UI; el criterio de esas tareas es `npm test`. El build debe quedar verde al final de la tarea 12.

## Review Focus

- Receta con cantidad 0 o producto sin receta: no divide entre 0 ni devuelve `Infinity`; no limita los lotes (tarea 3).
- Stock negativo en un insumo de la receta: el producto muestra 0 lotes y rojo, sin lanzar error (tarea 3).
- Producción en el log con `productoId` de un producto desactivado o inexistente: el stock se calcula igual y el historial muestra el id como respaldo (tareas 2 y 11).
- Producto inactivo: no aparece en dashboard ni aporta a la sugerencia (tareas 3 y 4).
- Importar un archivo inválido, o un respaldo v1/v2 válido: error legible en el primero; en los otros, mismo stock y round-trip exacto (tarea 5).

---

## File Structure

Crear: `src/domain/types/{insumo,producto,movimiento,estado,datos,index}.ts`, `src/domain/{stock,receta,estadoProducto,sugerencia,migracion,respaldo,repositorio,inicializar}.ts`, `src/testing/repositorioMemoria.ts`, `src/db/{esquema,repositorioDexie}.ts`, `src/ui/{ProductoCard,SelectorProducto}.tsx`.
Reemplazar: `src/domain/types.ts` (se divide), `src/domain/calc.ts` y sus tests (se eliminan), `src/db/db.ts` (se elimina), `src/domain/seed.ts`.
Modificar: `src/domain/index.ts`, `src/hooks/useDatos.ts`, `src/App.tsx`, `vitest.config.ts`, `package.json`, `src/styles.css`, y las pantallas `Dashboard`, `ProduceScreen`, `SugerenciaScreen`, `CompraScreen`, `ConteoScreen`, `HistorialScreen`, `ConfigScreen`, `RespaldoScreen`, `README.md`.

---

### Task 1: Tipos, semilla y configuración de pruebas

**Files:**
- Create: `src/domain/types/insumo.ts`, `producto.ts`, `movimiento.ts`, `estado.ts`, `datos.ts`, `index.ts`
- Delete: `src/domain/types.ts`
- Modify: `src/domain/seed.ts`, `vitest.config.ts`, `package.json`
- Test: `src/domain/seed.test.ts`

**Interfaces:**
- Produces (todo exportado desde `src/domain/types/index.ts`):
  - `Insumo` = el actual sin `consumoPorLote`.
  - `Producto { id: string; nombre: string; receta: Record<string, number>; objetivoLotes: number; activo: boolean }`.
  - `Movimiento` igual que hoy, con `{ tipo: 'produccion'; productoId?: string; lotes: number; descuentos: Record<string, number> }`. `MovimientoRegistro` sin cambios.
  - `Datos { insumos: Insumo[]; productos: Producto[]; movimientos: MovimientoRegistro[] }`.
  - `Color`, y los tipos derivados de `estado.ts`:
    - `EstadoInsumoProducto { insumo: Insumo; stock: number; lotes: number; negativo: boolean; color: Color }`
    - `EstadoProducto { producto: Producto; lotes: number; cuelloBotella: Insumo | null; lineas: EstadoInsumoProducto[]; color: Color; hayQueComprar: boolean }`
    - `EstadoInsumo { insumo: Insumo; stock: number; lotes: number | null; negativo: boolean; color: Color; necesitaCompra: boolean }`
    - `LineaSugerencia { insumo: Insumo; stockActual: number; lotesActuales: number; faltante: number; presentaciones: number; unidadesCompradas: number; costoEstimado: number }`
    - `Sugerencia { lineas: LineaSugerencia[]; costoTotal: number; objetivos: { productoId: string; nombre: string; lotes: number }[] }`
- `seed.ts` produce `CATALOGO_SEMILLA: Insumo[]` (7 insumos, con stevia) y `PRODUCTOS_SEMILLA: Producto[]` (2). Se elimina `CONFIG_SEMILLA`.

- [ ] **Step 1: Write the failing test** `seed.test.ts`: `PRODUCTOS_SEMILLA` tiene ids `['morena','stevia']`; `morena.receta` es `{te:150, azucar:800, limon:22, pet:18, tapa:18, agua:9.5}`; `stevia.receta` es `{te:150, stevia:30, limon:22, pet:18, tapa:18, agua:10}`; ambos `objetivoLotes === 3`; todo id de cada receta existe en `CATALOGO_SEMILLA`; el insumo `stevia` tiene `unidadBase 'ml'`, `presentacionCantidad 65`, `presentacionPrecio 58`.
- [ ] **Step 2: Run** `npx vitest run src/domain/seed.test.ts` — Expected: FAIL (no existe `PRODUCTOS_SEMILLA`).
- [ ] **Step 3: Implement** la división de tipos (mover, no reescribir), la semilla, y `vitest.config.ts` con `include: ['src/**/*.test.ts']`. Añadir `fake-indexeddb` a `devDependencies` (`npm install -D fake-indexeddb`). Mantener `src/domain/index.ts` exportando `./types` (ahora carpeta) y `./seed`; los módulos nuevos se agregan a ese índice en cada tarea.
- [ ] **Step 4: Run** `npx vitest run src/domain/seed.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** (incluye spec y plan)

```bash
git add docs src/domain vitest.config.ts package.json package-lock.json
git commit -m "feat(dominio): tipos de producto y semilla morena/stevia"
```

---

### Task 2: Stock y recetas

**Files:**
- Create: `src/domain/stock.ts`, `src/domain/receta.ts`
- Test: `src/domain/stock.test.ts`, `src/domain/receta.test.ts`

**Interfaces:**
- Produces en `stock.ts`: `ordenarLog(m: MovimientoRegistro[]): MovimientoRegistro[]`; `calcularStocks(m: MovimientoRegistro[]): Record<string, number>`; `stockDeInsumo(id: string, m: MovimientoRegistro[]): number`; `calcularDescuadre(fisico: number, teorico: number): number`. Lógica idéntica a `calc.ts` actual (mover).
- Produces en `receta.ts`:
  - `ID_PRODUCTO_LEGADO = 'morena'`
  - `productoIdDeProduccion(mov: { productoId?: string }): string`
  - `calcularDescuentos(producto: Producto, insumos: Insumo[], lotes: number): Record<string, number>` — solo insumos de la receta que existan y estén activos.
  - `armarProduccion(producto: Producto, insumos: Insumo[], lotes: number): Extract<Movimiento, { tipo: 'produccion' }>` — con `productoId`, `lotes` y `descuentos`.
  - `ultimosLotes(movs: MovimientoRegistro[], productoId: string, defecto = 2): number` — `lotes` de la última producción de ese producto (usa `productoIdDeProduccion`), o `defecto`.

- [ ] **Step 1: Write the failing tests.** `stock.test.ts`: migrar los casos de `calcularStocks`/`stockDeInsumo`/`calcularDescuadre`/orden cronológico de `calc.test.ts`. `receta.test.ts`: (a) morena 2 lotes descuenta `te 300, azucar 1600, limon 44, pet 36, tapa 36, agua 19` y no incluye `stevia`; (b) stevia 2 lotes descuenta `stevia 60, agua 20` y no incluye `azucar`; (c) producir morena y luego stevia deja el té compartido en `stock − 600`; (d) editar `stevia.receta.agua` a 9 después de una producción no cambia `calcularStocks` del log ya escrito; (e) log con `productoId` desconocido (`'fantasma'`) calcula el stock igual; (f) evento sin `productoId` → `productoIdDeProduccion` devuelve `'morena'`; (g) `ultimosLotes` devuelve 4 tras producciones de 2 y luego 4 de stevia, y 2 (defecto) si el producto nunca se produjo.
- [ ] **Step 2: Run** `npx vitest run src/domain/stock.test.ts src/domain/receta.test.ts` — Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** ambos módulos con las firmas de arriba; exportarlos desde `src/domain/index.ts`.
- [ ] **Step 4: Run** los mismos tests — Expected: PASS.
- [ ] **Step 5: Commit** `feat(dominio): stock y descuentos por receta de producto`.

---

### Task 3: Estado por producto e insumo

**Files:**
- Create: `src/domain/estadoProducto.ts`
- Test: `src/domain/estadoProducto.test.ts`

**Interfaces:**
- Consumes: `Insumo`, `Producto`, tipos de estado (Task 1); `calcularStocks` (Task 2).
- Produces:
  - `lotesRestantes(stock: number, porLote: number): { lotes: number; negativo: boolean }` — stock negativo → `{0, true}`; `porLote <= 0` → `{ lotes: Infinity, negativo: false }` (no limita).
  - `colorSemaforo(lotes: number, negativo: boolean, umbralLotes: number): Color` — igual que hoy (rojo si negativo o 0; amarillo si ≤ umbral; verde).
  - `calcularEstadoProductos(insumos: Insumo[], productos: Producto[], stocks: Record<string, number>): EstadoProducto[]` — solo productos activos; `lotes` = mínimo sobre las líneas, `0` si la receta no tiene líneas o el mínimo no es finito; `cuelloBotella` = insumo del mínimo (`null` si no hay líneas); `color` = peor color de las líneas (rojo > amarillo > verde; verde si no hay líneas con límite); `hayQueComprar` = alguna línea con `lotes <= umbralLotes`.
  - `calcularEstadoInsumos(insumos: Insumo[], productos: Producto[], stocks: Record<string, number>): EstadoInsumo[]` — insumos activos; `lotes` = mínimo entre los productos activos que lo usan, `null` si ninguno lo usa; `color` con `colorSemaforo` (si `lotes` es `null`: rojo si negativo, verde si no); `necesitaCompra` = `lotes !== null && lotes <= umbralLotes`.

- [ ] **Step 1: Write the failing tests.** Fixture A (stock real: te 100, azucar 1792, limon 795, pet 35, tapa 35, agua 190, stevia 0) con la semilla: morena → `lotes 0`, `cuelloBotella.id 'te'`, color `rojo`; stevia → `lotes 0`, color `rojo`. Fixture B (te 1000, stevia 100, limon 1000, pet 100, tapa 100, agua 200): stevia → `lotes 3`, `cuelloBotella.id 'stevia'` (floor(100/30)); hay 6 lotes de té y 5 de PET, así que el mínimo es único. Review Focus: receta `{ te: 0 }` → `lotes 0` sin `Infinity` ni `NaN`; stock `te = -50` → producto `rojo`, `lotes 0`, línea con `negativo true`, sin lanzar; producto con `activo: false` ausente de la salida. `calcularEstadoInsumos` con fixture A: `agua` → `lotes 19` (peor caso: stevia a 10 L) y `verde`; `azucar` (solo morena) → `lotes 2`, `amarillo`, `necesitaCompra true`; un insumo que ningún producto activo usa → `lotes null`.
- [ ] **Step 2: Run** `npx vitest run src/domain/estadoProducto.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** las cuatro funciones; exportar desde `index.ts`.
- [ ] **Step 4: Run** el mismo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(dominio): estado de lotes por producto e insumo`.

---

### Task 4: Sugerencia de compra mezclada

**Files:**
- Create: `src/domain/sugerencia.ts`
- Delete: `src/domain/calc.ts`, `src/domain/calc.test.ts`, `src/domain/fixture.test.ts` (sus casos ya viven en las tareas 2–4)
- Test: `src/domain/sugerencia.test.ts`

**Interfaces:**
- Consumes: `lotesRestantes` (Task 3), tipos de Task 1.
- Produces: `calcularSugerencia(insumos: Insumo[], productos: Producto[], stocks: Record<string, number>): Sugerencia`.
  - `requerido(insumo) = Σ producto.objetivoLotes × producto.receta[insumo.id]` sobre productos activos que lo usan.
  - Entra si, para algún producto activo que lo usa, `floor(stock / receta) <= insumo.umbralLotes` (stock negativo cuenta como 0 lotes).
  - `faltante = requerido − stock`; si ≤ 0 no entra; `presentaciones = ceil(faltante / presentacionCantidad)`; `unidadesCompradas`, `costoEstimado` como hoy; `lotesActuales` = peor caso entre sus productos.
  - `objetivos` = un elemento por producto activo.

- [ ] **Step 1: Write the failing test** con el fixture real (te 100, azucar 1792, limon 795, pet 35, tapa 35, agua 190, stevia 0) y la semilla. Afirmar ids `['azucar','pet','stevia','tapa','te']` (ordenados); `te`: 1 presentación, $154 (requerido 900, 3×150+3×150); `azucar`: 1 presentación, $22.5 (requerido 2400, faltan 608); `pet`: 1 presentación $176.32 (requerido 108); `tapa`: 1, $41.76; `stevia`: 2 frascos, $116 (requerido 90 ml, faltan 90, ceil(90/65)); `costoTotal` ≈ 510.58; `objetivos` = `[{morena,3},{stevia,3}]`. Casos extra: un producto con `activo: false` no suma al requerido (quitar stevia → té requerido 450); insumo que ya cubre el objetivo no aparece; stock negativo se trata como 0 lotes y `faltante` incluye el negativo.
- [ ] **Step 2: Run** `npx vitest run src/domain/sugerencia.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `calcularSugerencia`; borrar `calc.ts`, `calc.test.ts`, `fixture.test.ts`; actualizar `index.ts` para no exportar `./calc`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS en todo el dominio.
- [ ] **Step 5: Commit** `feat(dominio): sugerencia de compra mezclada 3+3`.

---

### Task 5: Migración v1→v2 y respaldo

**Files:**
- Create: `src/domain/migracion.ts`, `src/domain/respaldo.ts`
- Test: `src/domain/migracion.test.ts`, `src/domain/respaldo.test.ts`

**Interfaces:**
- Produces en `migracion.ts`:
  - `type InsumoV1 = Insumo & { consumoPorLote: number }`
  - `migrarInsumosV1(insumos: InsumoV1[]): { insumos: Insumo[]; productos: Producto[] }` — `morena` = receta con `consumoPorLote` de cada insumo existente (respeta ediciones); `stevia` = esa receta sin `azucar`, con `stevia: 30` y `agua: 10`; `objetivoLotes: 3` en ambos; `nombre` "Té con azúcar morena" / "Té con stevia"; quita `consumoPorLote` de cada insumo; agrega el insumo `stevia` de la semilla si no existe.
- Produces en `respaldo.ts`:
  - `interface Respaldo { formato: 'almacen-te'; version: 2; exportado: string; insumos: Insumo[]; productos: Producto[]; movimientos: MovimientoRegistro[] }`
  - `crearRespaldo(datos: Datos, ahora?: Date): Respaldo`
  - `parsearRespaldo(data: unknown): Datos` — acepta v1 (migra con `migrarInsumosV1`) y v2; lanza `Error('El archivo no es un respaldo valido de Almacen Te.')` si `formato` no es `'almacen-te'`, falta `insumos` o `movimientos`, o `version` no es 1 ni 2.

- [ ] **Step 1: Write the failing tests.** `migracion.test.ts`: con insumos v1 de la semilla vieja (`consumoPorLote` te 150, azucar 800, limon 22, pet 18, tapa 18, agua 9.5): `morena.receta` igual a la receta semilla; `stevia.receta` igual a la de stevia; con `consumoPorLote` de té editado a 160 → `morena.te === 160` y `stevia.te === 160`; ningún insumo conserva `consumoPorLote`; hay 7 insumos con `stevia`; si el v1 ya traía un `stevia` no se duplica; el stock calculado de un log v1 (compras, producciones sin `productoId`, ajuste) es idéntico antes y después. `respaldo.test.ts`: round-trip `parsearRespaldo(crearRespaldo(datos))` igual a `datos`; un v1 con eventos viejos se parsea con los mismos movimientos y productos nuevos; `parsearRespaldo({})`, `null`, `{formato:'otro'}` y `{formato:'almacen-te', version: 3, insumos: [], movimientos: []}` lanzan el mensaje exacto de arriba.
- [ ] **Step 2: Run** `npx vitest run src/domain/migracion.test.ts src/domain/respaldo.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** ambos módulos; exportar desde `index.ts`.
- [ ] **Step 4: Run** los mismos tests — Expected: PASS.
- [ ] **Step 5: Commit** `feat(dominio): migracion v1 a v2 y respaldo versionado`.

---

### Task 6: Repositorio, memoria y arranque

**Files:**
- Create: `src/domain/repositorio.ts`, `src/domain/inicializar.ts`, `src/testing/repositorioMemoria.ts`
- Test: `src/testing/contratoRepositorio.ts` (suite reutilizable), `src/testing/repositorioMemoria.test.ts`, `src/domain/inicializar.test.ts`

**Interfaces:**
- Produces:
  - `interface AlmacenRepositorio { leerTodo(): Promise<Datos>; agregarMovimiento(mov: Movimiento): Promise<void>; guardarInsumo(i: Insumo): Promise<void>; guardarProducto(p: Producto): Promise<void>; reemplazarTodo(d: Datos): Promise<void> }` (`reemplazarTodo` se añade al contrato del spec: lo necesitan el arranque y la importación de respaldos).
  - `crearRepositorioMemoria(datos?: Datos): AlmacenRepositorio` — `agregarMovimiento` asigna `id` (uuid) y `timestamp` ISO igual que hoy.
  - `inicializarAlmacen(repo: AlmacenRepositorio): Promise<void>` — si no hay insumos, `reemplazarTodo` con la semilla y `movimientos: []`; si ya hay datos no toca nada.
  - `ejecutarContrato(nombre: string, crear: () => Promise<AlmacenRepositorio>): void` — registra los `it` del contrato (describe interno).

- [ ] **Step 1: Write the failing tests.** `ejecutarContrato`: repo vacío → `leerTodo` devuelve tres arreglos vacíos; `guardarInsumo` crea y luego actualiza el mismo `id` sin duplicar; igual con `guardarProducto`; `agregarMovimiento` agrega un registro con `id` y `timestamp` y no permite modificar los anteriores (el arreglo crece, los previos intactos); `reemplazarTodo` borra lo anterior y deja exactamente los datos dados. `repositorioMemoria.test.ts` llama al contrato con memoria. `inicializar.test.ts`: repo vacío queda con 7 insumos, 2 productos y 0 movimientos; segunda llamada no duplica ni sobrescribe un insumo editado.
- [ ] **Step 2: Run** `npx vitest run src/testing src/domain/inicializar.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** los módulos con las firmas de arriba.
- [ ] **Step 4: Run** los mismos tests — Expected: PASS.
- [ ] **Step 5: Commit** `feat(dominio): contrato de repositorio e inicializacion`.

---

### Task 7: Repositorio Dexie y migración de base

**Files:**
- Create: `src/db/esquema.ts`, `src/db/repositorioDexie.ts`
- Delete: `src/db/db.ts`
- Test: `src/db/repositorioDexie.test.ts`, `src/db/migracionDexie.test.ts`

**Interfaces:**
- Consumes: `AlmacenRepositorio`, `migrarInsumosV1`, `ejecutarContrato`.
- Produces:
  - `esquema.ts`: `class AlmacenDB extends Dexie` con `version(1)` como hoy y `version(2)`: `productos: 'id, activo'`, `config: null`, y `upgrade(tx)` que lee `insumos` crudos, aplica `migrarInsumosV1` y reescribe `insumos` y `productos`; `crearAlmacenDB(nombre = 'almacen-te'): AlmacenDB` (el nombre configurable permite aislar bases en pruebas).
  - `repositorioDexie.ts`: `crearRepositorioDexie(db: AlmacenDB): AlmacenRepositorio`, y el singleton `repositorioApp = crearRepositorioDexie(crearAlmacenDB())`.

- [ ] **Step 1: Write the failing tests** (primera línea `import 'fake-indexeddb/auto'`). `repositorioDexie.test.ts`: `ejecutarContrato('dexie', ...)` creando una `AlmacenDB` con nombre único por prueba. `migracionDexie.test.ts`: abrir una base con el esquema v1 (clase mínima solo con `version(1)`), sembrar insumos v1 con `consumoPorLote` y 3 movimientos (compra, producción sin `productoId`, ajuste), cerrar, abrir con `crearAlmacenDB(mismoNombre)` y verificar: existen productos `morena` y `stevia`; los 7 insumos no tienen `consumoPorLote`; los 3 movimientos siguen idénticos; `calcularStocks` da lo mismo que antes de migrar.
- [ ] **Step 2: Run** `npx vitest run src/db` — Expected: FAIL.
- [ ] **Step 3: Implement** esquema y repositorio. `reemplazarTodo` limpia y escribe las tres tablas en una sola transacción `rw`. Eliminar `src/db/db.ts` (su lógica pasó a `respaldo.ts`, `inicializar.ts` y al repositorio).
- [ ] **Step 4: Run** `npx vitest run src/db` y luego `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): repositorio Dexie y migracion a v2`.

---

### Task 8: Cableado de la app

**Files:**
- Modify: `src/hooks/useDatos.ts`, `src/App.tsx`, `src/main.tsx` si importaba `db`, `src/ui/ConteoScreen.tsx`, `src/ui/RespaldoScreen.tsx`

**Interfaces:**
- Consumes: `AlmacenRepositorio`, `inicializarAlmacen`, `repositorioApp`, `crearRespaldo`, `parsearRespaldo`, `calcularStocks`, `calcularEstadoProductos`, `calcularEstadoInsumos`, `calcularSugerencia`.
- Produces:
  - `useDatos(repo: AlmacenRepositorio): { datos: Datos | null; cargando: boolean; recargar: () => Promise<void> }` (llama `inicializarAlmacen` una vez).
  - `App` crea `repo = repositorioApp`, deriva con `useMemo` `stocks`, `estadosProductos`, `estadosInsumos`, `sugerencia`, y pasa `repo` por props a las pantallas que escriben (`ProduceScreen`, `CompraScreen`, `ConteoScreen`, `ConfigScreen`, `RespaldoScreen`). `Vista` gana `{ t: 'produje'; productoId?: string }`.
  - Las pantallas reciben `Datos` ya cargados; ninguna importa de `src/db/` salvo `App`.

- [ ] **Step 1: Implement** el hook y `App.tsx` según lo anterior; `ConteoScreen` reemplaza `agregarMovimiento` de `db` por `repo.agregarMovimiento`; `RespaldoScreen` usa `crearRespaldo(await repo.leerTodo())` para exportar y `repo.reemplazarTodo(parsearRespaldo(json))` para importar (el mensaje de error de `parsearRespaldo` se muestra tal cual).
- [ ] **Step 2: Run** `npm test` — Expected: PASS (la UI aún no compila por completo; ver Global Constraints).
- [ ] **Step 3: Commit** `refactor(app): repositorio inyectado y estado derivado por producto`.

---

### Task 9: Dashboard por producto

**Files:**
- Create: `src/ui/ProductoCard.tsx`
- Modify: `src/ui/Dashboard.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `EstadoProducto`, `EstadoInsumo`.
- Produces:
  - `ProductoCard({ estado, onProduje }: { estado: EstadoProducto; onProduje: (productoId: string) => void })` — muestra nombre, lotes que alcanza, texto "Primero se acaba X" / "Te quedaste sin X", segmentos hacia `objetivoLotes` (reutiliza `.segmentos`/`.barra`), pill de color y un botón "Produje" (≥ 44 px) con `aria-label` que incluye el nombre del producto.
  - `Dashboard` props: `{ productos: EstadoProducto[]; insumos: EstadoInsumo[]; sinMovimientos: boolean; onProduje: (productoId: string) => void; onCompre: (insumoId?: string) => void; onConte: () => void; onComprar: () => void }`. Una `ProductoCard` por producto activo; se mantienen el aviso de conteo inicial, el aviso "N insumos por debajo del mínimo" (cuenta de `necesitaCompra`), los botones "Compré"/"Conté" y la lista de insumos (el pie usa `lotes`, o solo el stock si `lotes` es `null`). El botón general "Produje" se elimina: producir se hace desde cada tarjeta.

- [ ] **Step 1: Implement** componentes y CSS mínimo (variante compacta de `.hero` para que dos tarjetas quepan en pantalla de teléfono).
- [ ] **Step 2: Run** `npm run dev` y abrir en ancho móvil — Expected: dos tarjetas con su botón "Produje"; tocar el de stevia navega a la pantalla de producir (tarea 10).
- [ ] **Step 3: Commit** `feat(ui): tarjetas de producto en el dashboard`.

---

### Task 10: Producir con selector de producto

**Files:**
- Create: `src/ui/SelectorProducto.tsx`
- Modify: `src/ui/ProduceScreen.tsx`

**Interfaces:**
- Produces: `SelectorProducto({ productos, valor, onCambiar }: { productos: Producto[]; valor: string; onCambiar: (id: string) => void })` — control segmentado con las clases `.chips`/`.chip`, `aria-pressed`, alto ≥ 44 px; reutilizable en Config.
- `ProduceScreen` props: `{ repo: AlmacenRepositorio; insumos: Insumo[]; productos: Producto[]; movimientos: MovimientoRegistro[]; productoIdInicial: string; onGuardado: (msg: string) => void; onCancelar: () => void }`.
  - Estado inicial de `lotes` = `ultimosLotes(movimientos, productoId)`; al cambiar de producto se vuelve a calcular.
  - Vista previa de descuentos con `calcularDescuentos(producto, insumos, lotes)` y los lotes que quedan por insumo con `lotesRestantes(queda, receta[insumo.id])` (se conserva el aviso de stock negativo).
  - Guardar: `repo.agregarMovimiento(armarProduccion(producto, insumos, lotes))`; mensaje "Registré N lotes de {nombre}".

- [ ] **Step 1: Implement** ambos componentes; `App` pasa `productoIdInicial` desde la vista.
- [ ] **Step 2: Run** `npm run dev` — Expected: desde la tarjeta de morena el título dice morena y el número de lotes inicia en el último usado; cambiar al segmento stevia actualiza el descuento (stevia 30 ml/lote, sin azúcar); registrar crea un movimiento con `productoId` y el dashboard refleja el stock compartido.
- [ ] **Step 3: Commit** `feat(ui): producir por producto con ultimo valor usado`.

---

### Task 11: Sugerencia, compra e historial

**Files:**
- Modify: `src/ui/SugerenciaScreen.tsx`, `src/ui/CompraScreen.tsx`, `src/ui/HistorialScreen.tsx`

**Interfaces:**
- Consumes: `Sugerencia` (con `objetivos`), `calcularEstadoInsumos` (o su resultado), `productoIdDeProduccion`.
- `SugerenciaScreen`: la descripción sale de `objetivos` ("Cantidades para volver a tener 3 lotes de Té con azúcar morena y 3 de Té con stevia."); lista y total como hoy.
- `CompraScreen`: la vista previa de lotes tras comprar deja de usar `consumoPorLote`; usa el mínimo de `floor(stockNuevo / receta[insumo])` entre los productos activos que usan el insumo (nuevo helper puro `lotesParaStock(insumoId, productos, stock): number | null` en `estadoProducto.ts`, con su test en `estadoProducto.test.ts`: agua con 190 → 19, insumo sin producto → `null`). Si es `null` no se muestra la línea de lotes. Escribe con `repo.agregarMovimiento`.
- `HistorialScreen`: recibe `productos`; la fila de producción muestra "Producción · N lotes · {nombre del producto}" y, si el id no existe en `productos`, el id tal cual.

- [ ] **Step 1: Write the failing test** de `lotesParaStock` en `estadoProducto.test.ts`; **Run** `npx vitest run src/domain/estadoProducto.test.ts` — Expected: FAIL.
- [ ] **Step 2: Implement** el helper, exportarlo, y los cambios de pantalla; **Run** `npm test` — Expected: PASS.
- [ ] **Step 3: Commit** `feat(ui): sugerencia mixta, compra e historial por producto`.

---

### Task 12: Configuración de recetas

**Files:**
- Modify: `src/ui/ConfigScreen.tsx`

**Interfaces:**
- Props: `{ repo: AlmacenRepositorio; insumos: Insumo[]; productos: Producto[]; onGuardado: (msg: string) => void; onVolver: () => void }`.
- Secciones: (1) `SelectorProducto` + receta del producto elegido: un campo por insumo de su receta (etiqueta con nombre y unidad: g, ml, pza, L) y `objetivoLotes`; (2) precios y umbrales por insumo (presentación nombre, cantidad y precio editables, para pasar a un frasco grande de stevia). Todos con `inputMode="decimal"`. Guardar escribe `repo.guardarProducto` / `repo.guardarInsumo` solo para los modificados; botón deshabilitado sin cambios, como hoy.
- El editor de receta no debe permitir cantidades negativas ni vacías (se conserva el valor previo, como `num()` actual).

- [ ] **Step 1: Implement** la pantalla.
- [ ] **Step 2: Run** `npm run build` — Expected: sin errores de TypeScript ni de Vite (build verde).
- [ ] **Step 3: Run** `npm run dev` — Expected: cambiar agua de stevia a 9 y guardar actualiza la tarjeta de stevia en el dashboard; las producciones previas no cambian su descuento en el historial.
- [ ] **Step 4: Commit** `feat(ui): edicion de recetas por producto`.

---

### Task 13: Documentación y verificación final

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**: sección de productos y recetas, nueva estructura de carpetas (`domain/`, `db/`, `testing/`), migración v2 y formato de respaldo v2.
- [ ] **Step 2: Run** `npm test` — Expected: todos los tests PASS.
- [ ] **Step 3: Run** `npm run build` — Expected: build verde.
- [ ] **Step 4: Verificación manual** con `npm run build && npm run preview` en ancho móvil: (a) datos viejos migran sin perder stock (si el navegador tiene la base v1); (b) producir morena y stevia desde sus tarjetas, 3 toques cada una; (c) "Qué comprar" muestra la mezcla 3+3; (d) exportar respaldo v2 e importarlo; (e) modo offline sigue funcionando.
- [ ] **Step 5: Commit** `docs: productos, recetas y migracion v2`.
