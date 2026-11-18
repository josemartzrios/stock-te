# Etiquetas por producto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el stock de etiquetas (una por botella) de cada tipo de té para que la app diga para cuántos lotes alcanzan y cuándo comprar.

**Architecture:** Las etiquetas son dos insumos normales del catálogo, cada uno en la receta de su producto (18 por lote), igual que PET y tapa. Lotes, semáforo, Qué comprar, Compré y Conté ya funcionan con cualquier insumo, así que no hay código de UI. El código nuevo es la semilla, una función pura `asegurarEtiquetas` y su uso en la actualización de Dexie (v4) y en la importación de respaldos.

**Tech Stack:** TypeScript, React 18 (sin cambios), Dexie 4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-17-etiquetas-design.md`

## Global Constraints

- Insumos: ids `etiqueta-normal` y `etiqueta-sin-azucar`, unidad `pza`, presentación `pedido 100 pzas`, 100 piezas a $80.00 (los dos), `umbralLotes: 2`, `activo: true`.
- Normal va en la receta de `morena`; sin azúcar va en la de `stevia`. Consumo: 18 por lote.
- Textos del seed sin acentos, como el resto del seed: `Etiqueta te normal`, `Etiqueta te sin azucar`. Las rutas en negrita del README usan esos mismos textos.
- Dexie sube a v4: solo agrega lo que falta, nunca toca `movimientos`, no pisa un insumo existente (editado o desactivado) y deja un catálogo vacío vacío (aunque haya productos).
- Respaldo sigue en `version: 2`; importar uno sin etiquetas (v1 o v2) las agrega.
- Sin pantallas ni cambios de UI.
- Regla de receta: la línea de etiqueta se agrega a una receta solo cuando el insumo se agrega en esa misma pasada y la receta no trae esa clave. Una etiqueta quitada a propósito no reaparece al importar un respaldo.
- `asegurarEtiquetas` es total y pura: no muta sus argumentos; no lanza con elementos nulos ni con una `receta` que no sea objeto simple (`undefined`, `null`, texto, número o arreglo: ese producto queda como está). Usa `Object.prototype.hasOwnProperty.call(receta, id)` (no `in`; `Object.hasOwn` no compila con `lib: ES2020`) y recorre `ETIQUETAS_PRODUCTO` por entradas, nunca lo indexa con el id de un producto.
- `npx tsc --noEmit` debe pasar en cada commit (`tsconfig` tiene `noUnusedLocals: true` y revisa también los tests): quitar los imports que queden sin uso.
- Commits en español, `tipo: resumen`, con el trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nunca `git add -A` (hay un `.npmrc` sin versionar que no es de este trabajo).

## Review Focus

Entradas que el spec implica y que un usuario puede provocar; cada una tiene su prueba en la tarea indicada.

1. Receta que el usuario ya editó (te 160, etiqueta en 20 por lote) debe conservarse en la actualización: Task 2.
2. Etiqueta quitada a propósito de una receta no reaparece al importar un respaldo, y una clave presente en 0 se respeta: Task 2.
3. Stock negativo de etiquetas (se produjo más de lo contado): 0 lotes, línea negativa, rojo, sin lanzar: Task 1.
4. Catálogo vacío con productos no vacíos (respaldo parcial) se queda vacío; si no, `inicializarAlmacen` nunca sembraría el resto: Task 2 (función, respaldo y Dexie).
5. Recetas malformadas, elementos nulos e ids heredados (`constructor`, `__proto__`) no impiden abrir la base ni importar: Task 2.

---

### Task 1: Etiquetas en la semilla y en el dominio

**Files:**
- Modify: `src/domain/seed.ts`
- Modify: `src/domain/types/insumo.ts` (el comentario que enumera los ids suma `'etiqueta-normal' | 'etiqueta-sin-azucar'`)
- Modify: `src/domain/testHelpers.ts`
- Create: `src/domain/etiquetas.test.ts`
- Modify (fixtures que la semilla nueva rompe): `src/domain/seed.test.ts`, `src/domain/inicializar.test.ts`, `src/domain/receta.test.ts`, `src/domain/estadoProducto.test.ts`, `src/domain/sugerencia.test.ts`, `src/domain/hielo.test.ts`, `src/domain/migracion.test.ts`, `src/domain/respaldo.test.ts`, `src/db/migracionDexie.test.ts`

**Interfaces:**
- Produces, en `seed.ts` (también salen por `src/domain/index.ts`):
  - `export const ETIQUETA_POR_LOTE = 18`
  - `export const ETIQUETA_NORMAL: Insumo` y `export const ETIQUETA_SIN_AZUCAR: Insumo`
  - `export const ETIQUETAS_PRODUCTO: Record<string, Insumo>` = `{ morena: ETIQUETA_NORMAL, stevia: ETIQUETA_SIN_AZUCAR }` (productoId → su etiqueta)
- Produce, en `testHelpers.ts`:
  - `export function catalogoSinEtiquetas(): Insumo[]` — copias nuevas de los insumos de `CATALOGO_SEMILLA` sin los dos de etiqueta (el catálogo de antes de v4).
  - `export function productosSinEtiquetas(): Producto[]` — copia nueva de `PRODUCTOS_SEMILLA` con recetas nuevas (no comparten objeto con la semilla) sin las claves de etiqueta.

- [ ] **Step 1: Commitear el diseño y este plan**

```bash
git add docs/superpowers/specs/2026-11-17-etiquetas-design.md docs/superpowers/plans/2026-11-17-etiquetas.md
git commit -m "docs: diseno y plan de etiquetas por producto" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Escribir las pruebas que fallan** en `src/domain/etiquetas.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { CATALOGO_SEMILLA, ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR, PRODUCTOS_SEMILLA } from './seed';
import { calcularEstadoInsumos, calcularEstadoProductos } from './estadoProducto';
import { calcularSugerencia } from './sugerencia';
import { armarProduccion } from './receta';

const [morena, stevia] = PRODUCTOS_SEMILLA;
const HOLGADO: Record<string, number> = {
  te: 10000, azucar: 10000, stevia: 10000, limon: 10000, pet: 10000, tapa: 10000, agua: 10000,
  'etiqueta-normal': 10000, 'etiqueta-sin-azucar': 10000,
};

describe('semilla de etiquetas', () => {
  it('son dos insumos en piezas: pedido de 100 pzas a $80, umbral 2', () => {
    const esperadas = [
      [ETIQUETA_NORMAL, 'etiqueta-normal', 'Etiqueta te normal'],
      [ETIQUETA_SIN_AZUCAR, 'etiqueta-sin-azucar', 'Etiqueta te sin azucar'],
    ] as const;
    for (const [etiqueta, id, nombre] of esperadas) {
      expect(etiqueta).toEqual({
        id, nombre, unidadBase: 'pza', presentacionNombre: 'pedido 100 pzas',
        presentacionCantidad: 100, presentacionPrecio: 80, umbralLotes: 2, activo: true,
      });
      expect(CATALOGO_SEMILLA).toContainEqual(etiqueta);
    }
  });

  it('cada receta lleva solo la etiqueta de su producto, 18 por lote', () => {
    expect(morena.receta['etiqueta-normal']).toBe(18);
    expect(morena.receta['etiqueta-sin-azucar']).toBeUndefined();
    expect(stevia.receta['etiqueta-sin-azucar']).toBe(18);
    expect(stevia.receta['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en los lotes', () => {
  const estado = (stocks: Record<string, number>) =>
    calcularEstadoProductos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, ...stocks });

  it('con 36 etiquetas morena alcanza 2 lotes y la etiqueta es su cuello de botella', () => {
    const [m, s] = estado({ 'etiqueta-normal': 36 });
    expect(m.lotes).toBe(2);
    expect(m.cuelloBotella?.id).toBe('etiqueta-normal');
    // stevia no depende de la etiqueta normal: sus lotes no cambian con ella
    expect(s.lotes).toBe(estado({ 'etiqueta-normal': 0 })[1].lotes);
  });

  it('con 17 etiquetas no alcanza ni para un lote: 0 lotes y rojo', () => {
    const [m] = estado({ 'etiqueta-normal': 17 });
    expect(m.lotes).toBe(0);
    expect(m.color).toBe('rojo');
  });

  it('stock negativo de etiquetas: 0 lotes, linea negativa y rojo, sin lanzar', () => {
    const [m] = estado({ 'etiqueta-normal': -5 });
    expect(m.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({ lotes: 0, negativo: true, color: 'rojo' });
    expect(m.lotes).toBe(0);
  });

  it('en la lista de insumos: 36 piezas son 2 lotes, amarillo y piden compra', () => {
    const e = calcularEstadoInsumos(CATALOGO_SEMILLA, PRODUCTOS_SEMILLA, { ...HOLGADO, 'etiqueta-normal': 36 })
      .find((x) => x.insumo.id === 'etiqueta-normal')!;
    expect(e).toMatchObject({ lotes: 2, color: 'amarillo', necesitaCompra: true });
  });
});

describe('producir descuenta etiquetas', () => {
  it('1 lote de stevia descuenta 18 de la etiqueta sin azucar y ninguna de la normal', () => {
    const d = armarProduccion(stevia, CATALOGO_SEMILLA, 1).descuentos;
    expect(d['etiqueta-sin-azucar']).toBe(18);
    expect(d['etiqueta-normal']).toBeUndefined();
  });
});

describe('etiquetas en Que comprar', () => {
  const sug = (stocks: Record<string, number>, productos = PRODUCTOS_SEMILLA) =>
    calcularSugerencia(CATALOGO_SEMILLA, productos, { ...HOLGADO, ...stocks });

  it('sin etiquetas entra sola: faltante 54, 1 pedido de 100, $80', () => {
    const s = sug({ 'etiqueta-normal': 0 });
    expect(s.lineas.map((l) => l.insumo.id)).toEqual(['etiqueta-normal']);
    expect(s.lineas[0]).toMatchObject({ faltante: 54, presentaciones: 1, unidadesCompradas: 100, costoEstimado: 80 });
  });

  it('con 53 etiquetas (2 lotes, en el umbral) entra: faltante 1, 1 pedido', () => {
    const s = sug({ 'etiqueta-normal': 53 });
    expect(s.lineas[0]).toMatchObject({ insumo: ETIQUETA_NORMAL, lotesActuales: 2, faltante: 1, presentaciones: 1 });
  });

  it('con 54 etiquetas (3 lotes, sobre el umbral) ya no aparece', () => {
    expect(sug({ 'etiqueta-normal': 54 }).lineas).toHaveLength(0);
  });

  it('redondea a pedidos completos: objetivo 6 lotes => 108 pzas => 2 pedidos, $160', () => {
    const s = sug({ 'etiqueta-normal': 0 }, [{ ...morena, objetivoLotes: 6 }, stevia]);
    expect(s.lineas.find((l) => l.insumo.id === 'etiqueta-normal')).toMatchObject({
      faltante: 108, presentaciones: 2, costoEstimado: 160,
    });
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `npx vitest run src/domain/etiquetas.test.ts`
Expected: FAIL — `ETIQUETA_NORMAL` (y el otro export nuevo) no existen en `./seed`.

- [ ] **Step 4: Implementar en `src/domain/seed.ts`** las constantes de la sección Interfaces

  - `ETIQUETA_NORMAL` y `ETIQUETA_SIN_AZUCAR` con los valores de Global Constraints.
  - Agregarlas a `CATALOGO_SEMILLA` justo después de `agua` y antes de `HIELO` (`HIELO` sigue siendo el último).
  - Agregar `'etiqueta-normal': ETIQUETA_POR_LOTE` a la receta de `morena` y `'etiqueta-sin-azucar': ETIQUETA_POR_LOTE` a la de `stevia`, al final de cada receta.
  - Actualizar el comentario de ids en `src/domain/types/insumo.ts`.

- [ ] **Step 5: Implementar los helpers en `src/domain/testHelpers.ts`**: `catalogoSinEtiquetas()` y `productosSinEtiquetas()` (firmas en Interfaces; se apoyan en `ETIQUETAS_PRODUCTO` para saber qué ids quitar).

- [ ] **Step 6: Verificar que las pruebas nuevas pasan y ver qué rompió la semilla**

Run: `npx vitest run src/domain/etiquetas.test.ts`
Expected: PASS (todas).

Run: `npx vitest run`
Expected: FAIL solo en los archivos que corrige el Step 7; cualquier otro fallo es un error real.

- [ ] **Step 7: Corregir los fixtures que la semilla nueva rompe** (los comportamientos que prueban no cambian)

  - `seed.test.ts`: la receta esperada de morena pasa a `{ te: 150, azucar: 800, limon: 22, pet: 18, tapa: 18, agua: 9.5, 'etiqueta-normal': 18 }` y la de stevia a `{ te: 150, stevia: 30, limon: 22, pet: 18, tapa: 18, agua: 10, 'etiqueta-sin-azucar': 18 }`.
  - `inicializar.test.ts`: los tres `toHaveLength(8)` de insumos pasan a `10` (y el título "8 insumos" a "10 insumos").
  - `receta.test.ts`: el `toEqual` de "morena 2 lotes" suma `'etiqueta-normal': 36`.
  - `estadoProducto.test.ts`: las constantes `A` y `B` suman `'etiqueta-normal': 1000, 'etiqueta-sin-azucar': 1000` (sin eso, cada producto cae a 0 lotes; en `A` evita además que el empate en 0 lotes con `te` dependa solo del orden de la semilla).
  - `sugerencia.test.ts`: la constante `A` suma las mismas dos claves con `1000` (sin eso, las etiquetas entran a la lista y cambian el total de 510.58).
  - `hielo.test.ts`: en "no afecta los lotes de los productos", `stocks` suma las mismas dos claves con `1000` (sin eso la comparación es 0 contra 0 y no prueba nada).
  - `migracion.test.ts`: `insumosV1()` parte de `catalogoSinEtiquetas()` en vez de `CATALOGO_SEMILLA`; "morena y stevia salen con las recetas semilla" compara contra `productosSinEtiquetas()[0].receta` y `[1].receta`. Quitar el import de `PRODUCTOS_SEMILLA` (queda sin uso); `CATALOGO_SEMILLA` se sigue usando en la prueba de stevia.
  - `respaldo.test.ts`: el fixture `insumosV1` del caso v1 parte de `catalogoSinEtiquetas()`.
  - `migracionDexie.test.ts`: el fixture del test v1→v2 (el `bulkAdd`) y `sinHielo` del test v2→v3 parten de `catalogoSinEtiquetas()`. Quitar el import de `CATALOGO_SEMILLA` (queda sin uso). Los conteos (`8`, `sinHielo.length + 1`) no cambian en esta tarea.

- [ ] **Step 8: Verificar que todo pasa**

Run: `npx vitest run && npx tsc --noEmit`
Expected: Vitest con 0 fallos y `tsc` sin errores (ignora el aviso `npm error config prefix ...` del `.npmrc`).

- [ ] **Step 9: Commit**

```bash
git add src/domain/seed.ts src/domain/types/insumo.ts src/domain/testHelpers.ts src/domain/etiquetas.test.ts src/domain/seed.test.ts src/domain/inicializar.test.ts src/domain/receta.test.ts src/domain/estadoProducto.test.ts src/domain/sugerencia.test.ts src/domain/hielo.test.ts src/domain/migracion.test.ts src/domain/respaldo.test.ts src/db/migracionDexie.test.ts
git commit -m "feat: etiquetas por producto en la semilla" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Actualizar bases y respaldos existentes (Dexie v4)

**Files:**
- Modify: `src/domain/migracion.ts`
- Modify: `src/domain/respaldo.ts`
- Modify: `src/db/esquema.ts`
- Modify: `src/domain/etiquetas.test.ts`, `src/domain/respaldo.test.ts`, `src/db/migracionDexie.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes (Task 1): `ETIQUETAS_PRODUCTO`, `ETIQUETA_POR_LOTE` de `seed.ts`; `catalogoSinEtiquetas()` y `productosSinEtiquetas()` de `testHelpers.ts`.
- Produces, en `migracion.ts`:
  - `export function asegurarEtiquetas(insumos: Insumo[], productos: Producto[]): { insumos: Insumo[]; productos: Producto[] }`

  Reglas (además de las de Global Constraints): `insumos` vacío → devuelve `insumos` vacío y los `productos` sin cambios. Por cada `[productoId, etiqueta]` de `ETIQUETAS_PRODUCTO`, si el catálogo no tiene un insumo con ese id, lo agrega **al final** (en ese orden; lo ya existente conserva su posición, porque Dexie usa `slice(insumos.length)`) y, solo entonces, si el producto existe y su receta (objeto simple) no tiene la clave `etiqueta.id`, la agrega con `ETIQUETA_POR_LOTE`. El arreglo de productos conserva longitud y orden. Idempotente.

- [ ] **Step 1: Escribir las pruebas de la función pura** al final de `src/domain/etiquetas.test.ts` (agregar `asegurarEtiquetas` desde `./migracion`, `catalogoSinEtiquetas` y `productosSinEtiquetas` desde `./testHelpers`, y los tipos `Insumo`, `Producto` desde `./types`)

```ts
// Congela en profundidad: si la funcion muta una entrada, la prueba lanza TypeError.
const congelar = <T,>(x: T): T => {
  if (x && typeof x === 'object') {
    Object.values(x).forEach(congelar);
    Object.freeze(x);
  }
  return x;
};

describe('asegurarEtiquetas', () => {
  const cat = catalogoSinEtiquetas;
  const prods = productosSinEtiquetas;

  it('agrega las dos etiquetas al final, cada una en la receta de su producto, sin mutar las entradas', () => {
    const entrada = congelar(cat());
    const r = asegurarEtiquetas(entrada, congelar(prods()));
    expect(r.insumos.slice(0, entrada.length)).toEqual(entrada);
    expect(r.insumos.slice(-2)).toEqual([ETIQUETA_NORMAL, ETIQUETA_SIN_AZUCAR]);
    expect(r.productos.map((p) => p.receta)).toEqual(PRODUCTOS_SEMILLA.map((p) => p.receta));
  });

  it('respeta una receta editada (te 160) y una etiqueta ya puesta en 20 por lote', () => {
    const [m, s] = prods();
    const editado = { ...m, receta: { ...m.receta, te: 160, 'etiqueta-normal': 20 } };
    const r = asegurarEtiquetas(cat(), [editado, s]);
    expect(r.productos[0].receta).toMatchObject({ te: 160, 'etiqueta-normal': 20 });
    expect(r.productos[1].receta['etiqueta-sin-azucar']).toBe(18);
  });

  it('respeta una etiqueta puesta en 0 en la receta (el usuario la desactivo)', () => {
    const [m, s] = prods();
    const r = asegurarEtiquetas(cat(), [{ ...m, receta: { ...m.receta, 'etiqueta-normal': 0 } }, s]);
    expect(r.productos[0].receta['etiqueta-normal']).toBe(0);
  });

  it('no pisa una etiqueta existente (editada o desactivada) ni la vuelve a poner en la receta', () => {
    const editada = { ...ETIQUETA_NORMAL, presentacionPrecio: 95, activo: false };
    const r = asegurarEtiquetas([...cat(), editada], prods());
    expect(r.insumos.filter((i) => i.id === 'etiqueta-normal')).toEqual([editada]);
    expect(r.productos[0].receta['etiqueta-normal']).toBeUndefined();
    expect(r.insumos.filter((i) => i.id === 'etiqueta-sin-azucar')).toHaveLength(1);
    expect(r.productos[1].receta['etiqueta-sin-azucar']).toBe(18);
  });

  it('un catalogo vacio se deja vacio aunque haya productos (lo siembra la inicializacion)', () => {
    const productos = prods();
    const r = asegurarEtiquetas([], productos);
    expect(r.insumos).toEqual([]);
    expect(r.productos).toEqual(productos);
  });

  it('es idempotente: aplicarlo dos veces no duplica nada', () => {
    const una = asegurarEtiquetas(cat(), prods());
    expect(asegurarEtiquetas(una.insumos, una.productos)).toEqual(una);
  });

  it.each(['otro', 'constructor', 'toString', '__proto__', 'valueOf'])(
    'ignora un producto con id %s y solo agrega los 2 insumos',
    (id) => {
      const p = { id, nombre: 'x', receta: { te: 100 }, objetivoLotes: 3, activo: true };
      const r = asegurarEtiquetas(cat(), [p]);
      expect(r.productos).toEqual([p]);
      expect(r.insumos).toHaveLength(cat().length + 2);
    },
  );

  it.each([['sin receta', undefined], ['receta null', null], ['receta texto', 'x'], ['receta arreglo', []]])(
    '%s: no lanza y deja el producto como esta',
    (_nombre, receta) => {
      const raro = { id: 'morena', nombre: 'x', receta, objetivoLotes: 3, activo: false } as unknown as Producto;
      expect(() => asegurarEtiquetas(cat(), [raro])).not.toThrow();
      expect(asegurarEtiquetas(cat(), [raro]).productos).toEqual([raro]);
    },
  );

  it('no lanza con elementos nulos en el catalogo o en los productos', () => {
    const nulo = null as unknown as Insumo;
    expect(() => asegurarEtiquetas([nulo, ...cat()], [null as unknown as Producto, ...prods()])).not.toThrow();
  });
});
```

- [ ] **Step 2: Escribir las pruebas de respaldo** en `src/domain/respaldo.test.ts` (importar `catalogoSinEtiquetas`, `productosSinEtiquetas` desde `./testHelpers`)

  - En el test existente "se migra" del respaldo v1, agregar: `parsed.productos[0].receta['etiqueta-normal']` es `18`, `parsed.productos[1].receta['etiqueta-sin-azucar']` es `18`, y `parsed.insumos.filter((i) => i.id.startsWith('etiqueta'))` tiene longitud `2`.
  - Nuevo `describe('respaldos sin etiquetas')`:

```ts
it('un respaldo v2 sin etiquetas las agrega y no toca los movimientos', () => {
  const sin = { ...datos, insumos: catalogoSinEtiquetas(), productos: productosSinEtiquetas() };
  const parsed = parsearRespaldo(JSON.parse(JSON.stringify(crearRespaldo(sin))));
  expect(parsed.insumos.map((i) => i.id)).toEqual(expect.arrayContaining(['etiqueta-normal', 'etiqueta-sin-azucar']));
  expect(parsed.productos.map((p) => p.receta)).toEqual(PRODUCTOS_SEMILLA.map((p) => p.receta));
  expect(parsed.movimientos).toEqual(datos.movimientos);
});

it('un respaldo parcial sin catalogo (insumos vacios) se queda sin catalogo', () => {
  const parcial = { ...datos, insumos: [], productos: productosSinEtiquetas() };
  const parsed = parsearRespaldo(JSON.parse(JSON.stringify(crearRespaldo(parcial))));
  expect(parsed.insumos).toEqual([]);
  expect(parsed.productos).toEqual(productosSinEtiquetas());
  expect(parsed.movimientos).toEqual(datos.movimientos);
});
```

- [ ] **Step 3: Escribir las pruebas de Dexie** en `src/db/migracionDexie.test.ts` (importar `ETIQUETA_NORMAL`, `ETIQUETA_SIN_AZUCAR` desde `../domain/seed` y los dos helpers desde `../domain/testHelpers`)

  - Mover el helper `v2(nombre)` (hoy dentro del `describe` v2→v3) al nivel de módulo y agregar `const v3 = (nombre: string) => { const db = v2(nombre); db.version(3).stores({}); return db; };`.
  - Actualizar conteos: en v1→v2, `toHaveLength(8)` pasa a `10` con comentario `// + hielo (v3) + 2 etiquetas (v4)` y agregar que la receta de morena trae `'etiqueta-normal': 18` y conserva `te: 160`; en v2→v3, `sinHielo.length + 1` pasa a `sinHielo.length + 3`.
  - Nuevo `describe('upgrade de Dexie v3 -> v4')`:

```ts
it('agrega etiquetas y recetas sin tocar el resto ni el log', async () => {
  const nombre = 'migracion-v3';
  const db3 = v3(nombre);
  const catalogo = catalogoSinEtiquetas().map((i) => (i.id === 'te' ? { ...i, presentacionPrecio: 999 } : i));
  const productos = productosSinEtiquetas().map((p) => (p.id === 'morena' ? { ...p, receta: { ...p.receta, te: 160 } } : p));
  await db3.table('insumos').bulkAdd(catalogo);
  await db3.table('productos').bulkAdd(productos);
  await db3.table('movimientos').bulkAdd(movimientos);
  db3.close();

  const db = crearAlmacenDB(nombre);
  const datos = await crearRepositorioDexie(db).leerTodo();
  expect(datos.insumos).toHaveLength(catalogo.length + 2);
  expect(datos.insumos.find((i) => i.id === 'etiqueta-normal')).toEqual(ETIQUETA_NORMAL);
  expect(datos.insumos.find((i) => i.id === 'etiqueta-sin-azucar')).toEqual(ETIQUETA_SIN_AZUCAR);
  expect(datos.insumos.find((i) => i.id === 'te')?.presentacionPrecio).toBe(999);
  expect(datos.productos.find((p) => p.id === 'morena')?.receta).toEqual({ ...productos[0].receta, 'etiqueta-normal': 18 });
  expect(datos.productos.find((p) => p.id === 'stevia')?.receta).toEqual({ ...productos[1].receta, 'etiqueta-sin-azucar': 18 });
  expect([...datos.movimientos].sort((x, y) => x.id.localeCompare(y.id))).toEqual(movimientos);
  expect(calcularStocks(datos.movimientos)['etiqueta-normal']).toBeUndefined();
  db.close();
});

it('una base v3 vacia se queda vacia para que la siembre la inicializacion', async () => {
  const nombre = 'migracion-v3-vacia';
  const db3 = v3(nombre);
  await db3.open();
  db3.close();
  const db = crearAlmacenDB(nombre);
  expect(await crearRepositorioDexie(db).leerTodo()).toMatchObject({ insumos: [], productos: [] });
  db.close();
});

it('sin catalogo pero con productos y log: no agrega etiquetas y conserva todo', async () => {
  const nombre = 'migracion-v3-sin-catalogo';
  const db3 = v3(nombre);
  await db3.table('productos').bulkAdd(productosSinEtiquetas());
  await db3.table('movimientos').bulkAdd(movimientos);
  db3.close();
  const db = crearAlmacenDB(nombre);
  const datos = await crearRepositorioDexie(db).leerTodo();
  expect(datos.insumos).toEqual([]);
  expect(datos.productos).toHaveLength(2);
  expect(datos.movimientos).toHaveLength(movimientos.length);
  db.close();
});

it('un producto con receta malformada no impide abrir la base', async () => {
  const nombre = 'migracion-v3-receta-rota';
  const db3 = v3(nombre);
  await db3.table('insumos').bulkAdd(catalogoSinEtiquetas());
  await db3.table('productos').bulkAdd([{ id: 'morena', nombre: 'x', objetivoLotes: 3, activo: false }]);
  await db3.table('movimientos').bulkAdd(movimientos);
  db3.close();
  const db = crearAlmacenDB(nombre);
  const datos = await crearRepositorioDexie(db).leerTodo();
  expect(datos.insumos).toHaveLength(catalogoSinEtiquetas().length + 2);
  expect(datos.movimientos).toHaveLength(movimientos.length);
  db.close();
});
```

- [ ] **Step 4: Verificar que fallan**

Run: `npx vitest run src/domain/etiquetas.test.ts src/domain/respaldo.test.ts src/db/migracionDexie.test.ts`
Expected: FAIL — `asegurarEtiquetas` no está exportada, y los conteos 10 / `+ 3` y las etiquetas de respaldo no se cumplen.

- [ ] **Step 5: Implementar `asegurarEtiquetas` en `src/domain/migracion.ts`** con la firma y las reglas de la sección Interfaces (mismo estilo que `asegurarInsumosCasa`, justo debajo de ella). Su comentario de 3 líneas explica el porqué de la regla de receta: la línea solo se agrega cuando el insumo se agrega en esa pasada, para que una etiqueta quitada a propósito no reaparezca al importar un respaldo; y que un catálogo vacío se deja vacío.

- [ ] **Step 6: Usar la función en `src/domain/respaldo.ts`**: una función local `completarCatalogo(insumos: Insumo[], productos: Producto[]): { insumos: Insumo[]; productos: Producto[] }` que compone `asegurarInsumosCasa` y `asegurarEtiquetas`; las ramas v1 y v2 de `parsearRespaldo` la usan en lugar de llamar a `asegurarInsumosCasa` directo. Actualizar el comentario de `parsearRespaldo` (agrega hielo y etiquetas). No cambia `version: 2` ni `crearRespaldo`.

- [ ] **Step 7: Agregar la versión 4 en `src/db/esquema.ts`**: `this.version(4).stores({}).upgrade(...)` después de la v3, con comentario "v4: etiquetas por producto. Solo agrega lo que falta; nada mas cambia." La actualización usa `tx.table(...)` (nunca `db.insumos`), como la v3: lee `insumos` y `productos`, llama a `asegurarEtiquetas` y calcula `nuevos = resultado.insumos.slice(insumos.length)`. Si `nuevos` está vacío, termina sin escribir (por la regla de receta, sin insumos nuevos ningún producto cambia); si no, hace `bulkAdd(nuevos)` en `insumos` y `bulkPut(resultado.productos)` en `productos`. No se toca `movimientos`.

- [ ] **Step 8: Verificar que pasa todo**

Run: `npx vitest run`
Expected: PASS, 0 fallos.

- [ ] **Step 9: Actualizar `README.md`** (editar a mano: el texto real parte frases en dos líneas)

  - En la viñeta **Producto**, después de "Agregar otro producto es agregar datos, no código.", agregar: "Cada producto lleva su etiqueta (una por botella, 18 por lote; si cambias las botellas por lote, ajústala en Configuración): **Etiqueta te normal** para el de azúcar morena y **Etiqueta te sin azucar** para el de stevia. Se descuentan al producir y se compran en pedidos de 100."
  - En el párrafo de la base de datos, "**versión 3**" pasa a "**versión 4**" y "v3: el hielo" suma "; v4: las etiquetas" antes del paréntesis de cierre; "Importar un respaldo sin hielo también lo agrega" pasa a "Importar un respaldo sin hielo o sin etiquetas también los agrega".
  - En **Primer uso**, al final, agregar: "Si ya usabas la app, al actualizar aparecen las etiquetas con stock en cero y los dos productos se ven en rojo hasta que las cuentes con **Conté → Etiqueta te normal** y **Etiqueta te sin azucar**. Cuéntalas con Conté, no con Compré: registrar ahí una compra sustituiría el conteo real."
  - En **Respaldo**, después de "Conviene exportar un respaldo cada cierto tiempo, sobre todo antes de reinstalar o cambiar de teléfono", agregar: "y antes de actualizar la app a una versión nueva (la base solo avanza de versión, no se puede volver atrás)".

- [ ] **Step 10: Verificar tipos y suite completa**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` sin errores y Vitest con 0 fallos.

- [ ] **Step 11: Revisión manual (si hay navegador)**

Run: `npm run dev` y abrir `http://localhost:5173` con un perfil de navegador limpio.
Expected: en **Insumos** salen "Etiqueta te normal" y "Etiqueta te sin azucar" en rojo con "0 lotes"; en **Conté → O solo uno** se pueden contar solas; tras contar 36 de la normal sale "2 lotes" en amarillo y en **Ajustes → Configuración** cada receta muestra su etiqueta con 18.

- [ ] **Step 12: Commit**

```bash
git add src/domain/migracion.ts src/domain/respaldo.ts src/db/esquema.ts src/domain/etiquetas.test.ts src/domain/respaldo.test.ts src/db/migracionDexie.test.ts README.md
git commit -m "feat: dexie v4 agrega etiquetas a bases y respaldos existentes" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
