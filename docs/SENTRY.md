# Sentry (opcional)

[Sentry](https://sentry.io) tiene plan **gratuito** (Developer) suficiente para uso personal.

## Activar

1. Crea un proyecto **Browser** en Sentry y copia el **DSN**.
2. En CI (GitHub → Settings → Secrets): `SENTRY_DSN`.
3. El workflow inyecta el DSN al ensamblar (`scripts/build-app.mjs`).

Local:

```bash
set SENTRY_DSN=https://…@….ingest.sentry.io/…   # Windows
npm run build
```

Sin DSN la app funciona igual; `mcInitSentry()` no hace nada.

## Qué reporta

- Crashes en `ErrorBoundary` (`mcCaptureError`)
- Errores no capturados (si amplías handlers)

No se envían datos financieros — solo stack y versión de app.

## Vendor

El bundle está en `public/vendor/sentry.bundle.min.js`. Regenerar:

```bash
npm run build:sentry
```
