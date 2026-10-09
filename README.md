# Almacén de Insumos — Té Helado 🫖

PWA **local-first** para llevar el inventario de insumos de un negocio artesanal
de té helado embotellado. Funciona **100% offline** en el iPhone (Safari), sin
backend, sin cuenta, sin costo de infraestructura.

Responde en todo momento a cuatro preguntas:

1. ¿Cuánto queda de cada insumo?
2. ¿Para cuántos lotes alcanza? (el mínimo global es el cuello de botella)
3. ¿Cuándo hay que comprar? (semáforo + alertas por umbral)
4. ¿Cuánto costará la compra? (sugerencia con costo estimado)

Todo el inventario se **deriva de un log inmutable de movimientos** (event log).
El stock nunca es un campo editable: se calcula sumando compras y ajustes y
restando producciones.

---

## Correr en local

Requisitos: Node 18+ y npm.

```bash
npm install
npm run icons   # genera los íconos del PWA en public/ (una sola vez)
npm run dev     # abre http://localhost:5173
```

- `npm test` — corre las pruebas del dominio (Vitest).
- `npm run build` — genera el sitio estático en `dist/`.
- `npm run preview` — sirve el `dist/` ya construido (útil para probar el PWA).

> El `service worker` solo se activa en el build de producción, no en `dev`.
> Para probar el modo offline real: `npm run build && npm run preview`.

---

## Primer uso (carga inicial)

La app arranca con el catálogo real del negocio pero con **stock en cero**. El
primer día haces un **conteo físico** de cada insumo:

1. Toca **Conté → Contar todo**.
2. Captura cuánto hay de cada uno. El sistema lo registra como un ajuste.

A partir de ahí, cada día registras con un tap: **Produje** (en la tarjeta del
producto que hiciste), **Compré** o **Conté**.

---

## Desplegar gratis

El resultado del build es un sitio estático (carpeta `dist/`). Dos opciones $0:

### Opción A — Netlify (la más simple, dominio en la raíz)

1. `npm run build`
2. Entra a [app.netlify.com](https://app.netlify.com) → *Add new site* → *Deploy
   manually*.
3. Arrastra la carpeta `dist/`. Listo, te da una URL `https://...netlify.app`.

(Alternativa: conecta el repo de GitHub y Netlify reconstruye solo en cada push.)

### Opción B — GitHub Pages

GitHub Pages de proyecto sirve en `usuario.github.io/almacen-te/`, así que hay
que construir con la ruta base correcta:

```bash
# PowerShell (Windows)
$env:VITE_BASE="/almacen-te/"; npm run build

# bash / macOS / Linux
VITE_BASE="/almacen-te/" npm run build
```

Luego publica `dist/` en la rama `gh-pages` (por ejemplo con el paquete
`gh-pages`, o subiéndolo por la interfaz de GitHub Actions/Pages).

> Si usas un dominio propio o un sitio de usuario (raíz `/`), **no** definas
> `VITE_BASE` y el build servirá desde `/`.

---

## Instalar el PWA en el iPhone

1. Abre la URL desplegada en **Safari** (no Chrome; en iOS solo Safari instala PWAs).
2. Toca el botón **Compartir** (el cuadrito con la flecha hacia arriba).
3. **Agregar a inicio** → *Agregar*.
4. Aparece el ícono en la pantalla de inicio. Ábrelo desde ahí: corre a pantalla
   completa y funciona sin señal.

La primera vez ábrelo con internet para que se guarde en caché; después funciona
offline.

---

## Respaldo

Los datos viven **solo en tu iPhone** (IndexedDB). Para no perderlos:

- **Ajustes → Respaldo → Exportar**: genera un archivo `almacen-te-FECHA.json` y abre
  la hoja de compartir de iOS (guárdalo en Archivos, mándalo por correo, etc.).
- **Ajustes → Respaldo → Importar**: reemplaza todos los datos con los de un archivo.
  Pide confirmación explícita porque **sobrescribe todo**.

Conviene exportar un respaldo cada cierto tiempo, sobre todo antes de reinstalar
o cambiar de teléfono.

---

## Cómo funciona (modelo de datos)

- **Insumo** (catálogo): configuración editable — presentación de compra (nombre
  y tamaño), precio vigente, umbral de alerta. **No es un evento.**
- **Producto**: lo que se fabrica. Cada uno tiene su **receta** (cuánto insumo
  consume un lote) y su **objetivo de lotes** para sugerir compras. Hoy hay dos:
  té con azúcar morena y té con stevia. Los insumos son compartidos (té, limón,
  botellas, tapas, agua), así que producir uno baja el stock disponible del
  otro; el azúcar y la stevia solo afectan a su producto. Agregar otro producto
  es agregar datos, no código. Las recetas se editan en **Ajustes → Configuración**.
- **Movimiento** (event log inmutable): `compra`, `produccion` o `ajuste`. Nunca
  se edita ni se borra.
  - `compra` guarda las unidades que entraron y, como dato informativo, **cuántas
    presentaciones y de qué tamaño**. Al registrarla puedes tocar *Hoy compré otro
    tamaño* y capturar el empaque real (p. ej. 2 bolsas de 2 kg en promoción, en
    vez de la de 900 g de siempre) junto con lo que pagaste. Es solo para esa
    compra: el catálogo no se modifica.
  - `produccion` guarda el producto y un **snapshot** de cuánto descontó de cada insumo, con la
    receta vigente en ese momento. Si luego cambias la receta, el pasado **no** se
    recalcula.
  - `ajuste` guarda el stock físico contado y el **descuadre** (físico − teórico).
    El descuadre queda visible en el historial; nunca se oculta.
- **Stock** = Σ compras + Σ ajustes(descuadre) − Σ producciones.descuentos.
  Se calcula con un reducer puro en `src/domain/` (sin dependencias de UI).
  Las producciones anteriores a los productos se leen como té con azúcar morena.
- **Sugerencia de compra**: para cubrir el objetivo de **todos** los productos a
  la vez (hoy 3 lotes de cada uno). Un insumo compartido suma el consumo de
  ambos: p. ej. el té requiere 3×150 g + 3×150 g.

El stock puede quedar **negativo** tras una producción (significa que el teórico
estaba mal): la app no bloquea, lo muestra en rojo y sugiere contar físico.

### Semáforo

Se calcula por producto, contra el mismo stock:

- 🟢 verde: todos los insumos de su receta alcanzan para más lotes que el umbral.
- 🟡 amarillo: algún insumo alcanza para el umbral o menos (hay que comprar pronto).
- 🔴 rojo: no alcanza ni para un lote (0 o negativo).

---

## Estructura

```
src/
  domain/     Lógica pura (stock, recetas, estado por producto, sugerencia,
              migración, respaldo) + la interfaz AlmacenRepositorio + tests
  db/         Persistencia con Dexie (IndexedDB): esquema y migraciones,
              repositorio. Único lugar que conoce a Dexie
  testing/    Repositorio en memoria y suite de contrato para los repositorios
  hooks/      useDatos: carga el estado desde el repositorio
  ui/         Pantallas de React + armazon comun (Screen, TabBar, Icons, tema)
  styles.css  Sistema de diseno: tokens semanticos con tema claro/oscuro
scripts/
  generate-icons.mjs   Genera los PNG del PWA (sin dependencias externas)
```

La app depende de la interfaz `AlmacenRepositorio`; la UI recibe el repositorio
por props. La base de datos está en la **versión 2** (productos con receta): al
abrir una base antigua, Dexie migra el catálogo sin tocar el historial. Los
respaldos exportados son `version: 2`; los `version: 1` se siguen pudiendo
importar y se migran al leerlos.

Las pruebas (`npm test`) cubren el dominio (stock, recetas, lotes por producto,
sugerencia mixta con el stock real del negocio, migración y respaldo) y los
repositorios (memoria y Dexie con `fake-indexeddb`, incluida la migración v1→v2).
No se prueba la UI.
