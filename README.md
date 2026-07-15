# Mi Cartera 💸

PWA de finanzas personales: patrimonio neto, gastos variables, costes fijos, inversiones (multi-bróker) y deudas. Móvil-first, instalable, con sincronización automática de gastos vía notificaciones del banco.

> Proyecto personal de [Juanjo]. Hecho por ilusión y aprendizaje.

---

## 🏗️ Stack

- **Frontend:** React 18 (inlineado, **sin paso de build en navegador**, usando `React.createElement` directo — NO JSX, NO Babel)
- **Persistencia local:** `localStorage` con sistema de migraciones versionado (`_dataVer`)
- **PWA:** Service Worker *network-first* + manifest
- **Backend de datos:** Supabase (Postgres + Auth + Edge Functions). Login email+contraseña + desbloqueo biométrico
- **Captura automática:** MacroDroid (Android) lee la notificación de Trade Republic → POST a la Edge Function `ingest`
- **Cotizaciones:** Finnhub (vía Edge Function `prices` para ocultar la key y evitar CORS)
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions (build + deploy en cada push a `main`)

## 📂 Estructura del repo

```
mi-cartera/
├── public/                 # 👈 Artefacto desplegable (lo que sirve GitHub Pages)
│   ├── index.html          #     App completa (React + CSS + lógica, todo inlineado)
│   ├── manifest.json
│   ├── sw.js               #     Service Worker (la versión se sella en CI)
│   ├── icon-192.png · icon-512.png · apple-touch-icon.png
│   └── .nojekyll           #     Evita que GH Pages procese con Jekyll
├── supabase/                # Backend en la nube (Fase 1)
│   ├── migrations/          #     Esquema SQL (expenses, app_state, RLS, grants)
│   └── functions/           #     Edge Functions: ingest (MacroDroid) y prices (Finnhub)
├── scripts/
│   └── stamp-version.mjs   # Sella la versión del SW antes del deploy
├── docs/
│   └── ARQUITECTURA.md     # Decisiones técnicas y aprendizajes
├── .github/workflows/
│   └── deploy.yml          # Pipeline de despliegue a GitHub Pages
├── VERSION                 # Única fuente de verdad de la versión
├── CHANGELOG.md
└── .gitignore
```

## 🚀 Desarrollo

No hay paso de build obligatorio para tocar la app: editas `public/index.html` y abres el archivo en el navegador. El único script automatizado es el sellado de versión del Service Worker, que también corre en CI.

```bash
# Tests (sintaxis, lógica pura, parsers Revolut, deudas, conciliación banco, ingest Deno)
npm test

# (opcional, local) sellar versión del SW manualmente
node scripts/stamp-version.mjs
```

## 📦 Despliegue

Push a `main` → GitHub Actions sella la versión del SW y publica `public/` en GitHub Pages. Sin pasos manuales, sin tocar Netlify.

## 🔐 Secretos

- La **API key de Finnhub NO está en el repo**. Vive como secreto del proyecto Supabase (Edge Functions → Secrets), junto con `INGEST_TOKEN`, `INGEST_USER_ID` y **`TOKEN_ENCRYPTION_KEY`** (32 bytes en base64 — cifra tokens MyInvestor/Open Banking en reposo).
- En `public/index.html` solo va la **anon key** de Supabase, que es pública por diseño (los datos están protegidos con Row Level Security). La función `ingest` se protege con `INGEST_TOKEN`.
- Setup completo del backend en [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md).
- Política de privacidad: [public/privacy.html](public/privacy.html).

## 🗺️ Roadmap

Ver `CHANGELOG.md` (hecho) y `docs/ARQUITECTURA.md` (fases futuras).
