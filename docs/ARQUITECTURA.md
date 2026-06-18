# Arquitectura — Mi Cartera

## Principios de diseño

### 1. Sin JSX/Babel en el navegador
La app usa `React.createElement` directo. Meter JSX + Babel en el navegador provocaba errores de `import jsx-runtime` y pantalla en blanco. `createElement` directo = robusto y sin sorpresas. **No reintroducir un transpilador en runtime.**

### 2. Un único artefacto desplegable
`public/index.html` lleva React, ReactDOM, CSS y lógica **inlineados**. Es el artefacto que ha demostrado ser fiable. Cualquier modularización futura del *código fuente* debe seguir produciendo este mismo archivo único.

### 3. Service Worker network-first
Imprescindible para que el PWA en el móvil reciba siempre el último deploy. La cadena de versión del SW se sella en CI (`scripts/stamp-version.mjs`) para invalidar caché sin trabajo manual.

### 4. Migraciones de datos versionadas
`_dataVer` en `localStorage` permite cambiar la forma de los datos sembrados sin borrar los del usuario.

## Flujo de datos

```
[Notificación TR en Android]
        │  MacroDroid detecta "Gastaste X€ en Comercio"
        ▼
[POST → Apps Script doPost]
        │  parsea importe/comercio/fecha + categoriza
        ▼
[Google Sheet "Hoja 1"]   ← buzón de entrada
        │  la app llama doGet (botón Sincronizar)
        ▼
[App: dedup + render]      → localStorage "micartera_v3"
```

Cotizaciones: la app llama `doGet?prices=1` → Apps Script consulta Finnhub server-side (evita CORS) → devuelve precios → la app calcula valor = acciones × precio.

## Aprendizajes clave

- **Republicar Apps Script:** hay que seleccionar explícitamente "Nueva versión" en Administrar implementaciones, o la URL sirve código cacheado.
- **Fechas en Sheets:** se guardan como objetos Date, no string; `normalizarFecha()` lo resuelve antes de cualquier filtrado.
- **CORS Finnhub:** no se puede llamar desde el navegador; va server-side vía Apps Script.
- **GitHub Pages + cuenta Free:** solo funciona con repo **público**; un repo privado requiere plan de pago. Actions es ilimitado en repos públicos.

## Backlog técnico (post-migración)

### Fase 0 — control (barato)
- Versionado visible en Settings + mini changelog.
- Pantalla de Settings: moneda, presupuesto, objetivo de ahorro, toggles, reset.
- Export/Import JSON (backup manual).
- Manejo de errores visible (Sheet / precios).

### Fase 1 — base de datos real
- Migrar de Sheets a Supabase (Postgres + auth + API, free tier) o Firebase. Sheets queda solo como buzón de entrada.

### Fase 2 — cuentas de usuario (solo si se comparte con terceros)
- Registro/login, aislamiento de datos.

### Fase 3 — legal/RGPD (obligatorio si hay terceros)
- Datos financieros = sensibles: política de privacidad, consentimiento, cifrado en reposo, derecho al olvido.
- Las fases 1+2+3 se abordan juntas si la app pasa a multiusuario.

### Fase 4 — distribución/robustez
- APK (Capacitor/PWABuilder), dominio propio, tests de cálculos críticos, monitorización de errores, reemplazo de MacroDroid, CI/CD avanzado.

### Fase 5 — nice to have
- Notificaciones push, gráficas de evolución, objetivos de ahorro, multi-moneda real, comparación mes a mes, categorización con IA.

## Decisiones pendientes de discusión

- **Endurecer `GAS_URL`:** hoy es un endpoint abierto; el `doGet` expone los gastos del mes a quien tenga la URL. Un token compartido (en Script Properties + cabecera/param) mitigaría esto sin coste.
- **Conversión USD→EUR:** hoy `fx` es un valor fijo. No casará nunca al céntimo con Revolut (Revolut aplica su propio cambio + spread, y el precio de Finnhub puede ir con retardo). Decidir si el objetivo es "exacto como Revolut" (→ input manual del valor en EUR) o "aproximado en tiempo real" (→ precio × acciones × fx dinámico).
