# Etiquetas por producto — Diseño (corto)

Fecha: 2026-11-17 · Tamaño: cambio pequeño

## Intención

El negocio ya tiene marca y manda imprimir etiquetas: una para el té normal
y otra para el té sin azúcar. Hoy la app no sabe cuántas hay, así que no avisa
cuándo comprar más. Se quiere saber **cuántas etiquetas quedan de cada tipo**
para decidir cuándo comprar, igual que con botellas y tapas.

Se etiqueta **al embotellar**, en el mismo momento que se registra *Produje*.

## Objetivos

- Saber cuántas etiquetas quedan de cada tipo y para cuántos lotes alcanzan.
- Que bajen solas al registrar una producción, sin toques extra.
- Que aparezcan en **Qué comprar** (con costo) cuando estén por debajo del
  umbral.

## No objetivos

- Diseño o impresión de las etiquetas.
- Más de dos tipos de etiqueta (agregar otro es agregar datos).
- Registrar merma de etiquetas por separado: un descuadre se corrige con
  **Conté**, como con cualquier insumo.

## Anti-objetivos (sería un fallo aunque funcione)

- Tocar el historial de movimientos o el stock actual de los demás insumos.
- Recalcular producciones pasadas: no descuentan etiquetas, el pasado queda
  como está.
- Pisar una receta que ya se haya editado en Configuración.

## Enfoque

Tres caminos considerados:

1. **Etiqueta como insumo en la receta, igual que PET y tapa** *(elegido)*.
   Casi todo ya existe: descuento al producir, lotes que alcanza, cuello de
   botella, semáforo, Qué comprar con costo, Compré y Conté. No hay concepto
   nuevo.
2. **Insumo que avisa pero no limita los lotes.** Serviría si se etiquetara
   después de embotellar. Descartado: se etiqueta al embotellar y agregaría
   una excepción al modelo.
3. **Solo conteo manual, como el hielo.** Descartado: no descuenta solo, no
   dice para cuántos lotes alcanza y no entra a la sugerencia de compra.

## Diseño

**Insumos nuevos** (catálogo, unidad `pza`):

| id | Nombre | Va en la receta de |
|---|---|---|
| `etiqueta-normal` | Etiqueta té normal | `morena` (té con azúcar morena) |
| `etiqueta-sin-azucar` | Etiqueta té sin azúcar | `stevia` (té con stevia) |

- Consumo: **18 por lote** (una por botella, igual que PET y tapa). Editable en
  Configuración. Es un valor fijo: si cambias PET y tapa, ajusta también la
  etiqueta.
- Umbral de aviso: 2 lotes, como los demás. Editable por insumo (útil si
  imprimir tarda días).
- Presentación de compra: "pedido 100 pzas", 100 piezas a $80.00 (dato del
  usuario). Supuesto mío: aplica igual a los dos tipos de etiqueta; se edita
  por insumo en Configuración si difieren.

**Base de datos (Dexie v4).** Igual que la v3 del hielo, solo agrega lo que
falta:

- Agrega los dos insumos si no existen. No pisa uno existente aunque esté
  editado o desactivado.
- Agrega la etiqueta a la receta de `morena` y `stevia` solo cuando el insumo
  se agrega en esa misma pasada y la receta no la tiene ya. Así una etiqueta que
  el usuario quitó a propósito de una receta no reaparece al importar un
  respaldo.
- No toca `movimientos`. Un catálogo vacío se deja así: lo siembra la
  inicialización completa.

**Semilla.** Instalaciones nuevas traen los dos insumos y las recetas con
etiqueta.

**Respaldos.** Importar un respaldo sin etiquetas también las agrega (mismo
mecanismo que el hielo). La versión del respaldo no cambia.

**UI.** Sin pantallas nuevas: las etiquetas salen en la lista de Insumos, Qué
comprar, Compré, Conté y el editor de recetas por ser insumos normales.

## Consecuencia conocida

El stock sale del log y de las etiquetas no hay nada registrado. Tras la
actualización, los dos productos se verán en rojo (0 lotes, cuello de botella
= etiqueta) hasta que se cuenten las etiquetas una vez en **Conté**. Es
intencional: la app no inventa stock. Se cuentan con **Conté**, no con
**Compré**: tocar la fila en el inicio abre Compré, y registrar ahí "compré 100"
sustituiría el conteo real. La base pasa a v4 y no se puede volver atrás:
exportar un respaldo (Ajustes → Respaldo) antes de desplegar.

## Pruebas

- Dominio: la semilla trae los insumos y las recetas; la etiqueta limita los
  lotes cuando es el mínimo; entra a la sugerencia con el redondeo a
  presentaciones.
- Migración (puro y Dexie con `fake-indexeddb`, v3 → v4): agrega insumos y
  recetas, respeta una receta editada, no toca movimientos.
- Respaldo: importar uno sin etiquetas las agrega.

## Queda al constructor

- Nombres exactos de ids y textos, y dónde va cada cambio dentro de
  `seed.ts`, `migracion.ts`, `esquema.ts` y `respaldo.ts`.
- **Conté** ya permite contar un insumo suelto ("O solo uno" en
  `ConteoScreen`): no hace falta cambio.
- Actualizar el README (viñeta de Producto, versión de la base: 4 y el aviso de
  contar las etiquetas con Conté).
