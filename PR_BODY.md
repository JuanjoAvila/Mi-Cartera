# Cambios en Herramientas de inversión (Cartera)

Elimina la funcionalidad de ordenar brókers por drag&drop/flechas, ya que el usuario pidió quitarla.

### Archivos modificados:

- `14-v4-screens.js`: borrado el IIFE autoejecutable que renderizaba los botones up/down "al inicio" / "al fondo" en la sección de Herramientas dentro del modal Cartera. El componente Investments se mantiene intacto.
- `06-sync-brokers.js`: reemplazo de secOrderOf(state, 'cartera_brokers', groupsBase.map(...)) por orden fijo directo (groupsBase.map(g => g[0])). Ya no se lee del estado porque se eliminó la fuente que lo modificaba. Order: revolut -> trade_republic -> myinvestor (solo los que tienen posiciones).
- `01-i18n.js`: borrado v4_broker_order y v4_broker_order_h en los 3 idiomas (es/en/ca) - claves huérfanas.

### Build

El build pasa limpio: npm run build produce el bundle sin errores.

### Testing recomendado

Verificar con Playwright en la vista Cartera->Inversiones que los 3 brókers se mantienen visibles en su orden fijo y que no hay columnas rotas ni errores de JS al abrir Herramientas.
