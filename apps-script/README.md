# Apps Script — Mi Cartera

Backend de datos: recibe los gastos (POST de MacroDroid), los escribe en el Sheet, y sirve los gastos del mes + las cotizaciones (GET).

## 🔑 Configurar la API key de Finnhub (una sola vez)

La key **no se commitea**. Se guarda en *Script Properties*:

1. finnhub.io → genera tu API key (free tier).
2. En el editor de Apps Script: **Configuración del proyecto** (⚙️) → **Propiedades del script** → **Añadir propiedad del script**.
3. Clave: `FINNHUB_KEY` · Valor: tu key.
4. Guardar.

`doGetPrices()` la lee con `PropertiesService.getScriptProperties().getProperty("FINNHUB_KEY")`.

> ⚠️ Si alguna vez la key se expuso (por ejemplo en un commit antiguo o un mensaje), **regénerala en finnhub.io** y actualiza la propiedad. Una key filtrada se puede usar hasta agotar tu cuota.

## 🚀 Desplegar / republicar (el gotcha importante)

Al cambiar el código **no basta con guardar**. Para que la URL `/exec` sirva el código nuevo:

1. **Implementar** → **Administrar implementaciones**.
2. Edita la implementación activa (✏️).
3. En *Versión* selecciona **Nueva versión** (NO dejes "Head" / la versión anterior).
4. Implementar.

Si te saltas el paso 3, la URL sigue sirviendo código cacheado antiguo. (Ya has tropezado con esto antes.)

## 🧪 Verificar antes de tocar la app

Desde el editor, ejecuta y mira los logs:

- `testGet()` — comprueba qué devuelve `doGet` para el mes actual.
- `testPrices()` — comprueba que las cotizaciones llegan (requiere `FINNHUB_KEY` configurada).
- `testManual()` — simula un POST de gasto.

## 📌 Recursos

- **Sheet ID:** `1Pl9thaULwg7jCSgCxp-MAxb-jtysMMQ7LyiLCfgfse8`
- **Hoja:** `Hoja 1`
- **Endpoint:** la URL `/exec` de la implementación (también está en `public/index.html` como `CONFIG.GAS_URL`).
