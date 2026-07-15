# Testing — Mi Cartera

## Flujo local (CMD o PowerShell)

Abre **CMD** o **PowerShell**, ve a la carpeta del proyecto y ejecuta:

```powershell
cd "E:\Mi Cartera"
```

### Si `npm ci` falla con “package-lock.json”

Eso pasa si la carpeta **no tiene el lockfile** (copia vieja, zip, o sin `git pull`).

**Solución:**

```powershell
git pull origin main
npm install
```

`npm install` genera/actualiza `package-lock.json`. Luego ya puedes usar `npm ci` en adelante.

### Instalación completa (una vez)

```powershell
git pull origin main
npm install
npx playwright install chromium
```

### Ejecutar tests

```powershell
npm test          # build + unit + E2E
npm run test:e2e  # solo Playwright (más rápido)
npm run build     # solo ensamblar src → public/index.html
```

## Capas

| Capa | Qué cubre | Dónde |
|------|-----------|--------|
| **build-app** | Ensambla `src/modules/` → `public/index.html` | `scripts/build-app.mjs` |
| **check-syntax** | Sintaxis VM de cada `<script>` inline | `scripts/check-syntax.mjs` |
| **Unit (Node)** | Motor financiero, parsers Revolut, onboarding… | `tests/*.test.mjs` |
| **Deno** | ingest, crypto, delete-account | `supabase/functions/**/*.test.ts` |
| **Playwright** | Smoke UI + flujo borrar cuenta | `e2e/*.spec.mjs` |

## Fuente editable

Tras v3.108.0 la lógica vive en **`src/modules/*.js`**. No edites `public/index.html` a mano — se regenera con `npm run build`.

## CI

- `.github/workflows/test.yml` — push/PR
- `.github/workflows/deploy.yml` — job `test` antes de publicar Pages

## Playwright en modo visual (opcional)

```powershell
npx playwright test --ui
```

Abre una ventana donde ves el navegador y cada paso del test.
