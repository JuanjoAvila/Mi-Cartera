# Testing — Mi Cartera

## Flujo local

```bash
npm ci
npx playwright install chromium
npm test          # build-app + unit + Deno (si hay) + Playwright E2E
npm run test:e2e  # solo E2E
```

## Capas

| Capa | Qué cubre | Dónde |
|------|-----------|--------|
| **build-app** | Ensambla `src/modules/` → `public/index.html` | `scripts/build-app.mjs` |
| **check-syntax** | Sintaxis VM de cada `<script>` inline | `scripts/check-syntax.mjs` |
| **Unit (Node)** | Motor financiero, parsers Revolut, onboarding… | `tests/*.test.mjs` |
| **Deno** | ingest, crypto, delete-account | `supabase/functions/**/*.test.ts` |
| **Playwright** | Smoke UI + flujo borrar cuenta (confirmación) | `e2e/*.spec.mjs` |

## Fuente editable

Tras v3.108.0 la lógica vive en **`src/modules/*.js`**. No edites `public/index.html` a mano — se regenera con `npm run build`.

## CI

- `.github/workflows/test.yml` — push/PR
- `.github/workflows/deploy.yml` — job `test` antes de publicar Pages
