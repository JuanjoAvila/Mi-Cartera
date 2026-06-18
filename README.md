# Mi Cartera 💸

PWA de finanzas personales: patrimonio neto, gastos variables, costes fijos, inversiones (multi-bróker) y deudas. Móvil-first, instalable, con sincronización automática de gastos vía notificaciones del banco.

> Proyecto personal de [Juanjo]. Hecho por ilusión y aprendizaje.

---

## 🏗️ Stack

- **Frontend:** React 18 (inlineado, **sin paso de build en navegador**, usando `React.createElement` directo — NO JSX, NO Babel)
- **Persistencia local:** `localStorage` con sistema de migraciones versionado (`_dataVer`)
- **PWA:** Service Worker *network-first* + manifest
- **Backend de datos:** Google Apps Script + Google Sheets (buzón de entrada de gastos)
- **Captura automática:** MacroDroid (Android) lee la notificación de Trade Republic → POST al Apps Script
- **Cotizaciones:** Finnhub (vía Apps Script para evitar CORS)
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
├── apps-script/
│   ├── Code.gs             # Backend GAS (la API key NO va aquí, va en Script Properties)
│   └── README.md           # Instrucciones de despliegue/republicación del GAS
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
# (opcional, local) sellar versión del SW manualmente
node scripts/stamp-version.mjs
```

## 📦 Despliegue

Push a `main` → GitHub Actions sella la versión del SW y publica `public/` en GitHub Pages. Sin pasos manuales, sin tocar Netlify.

## 🔐 Secretos

- La **API key de Finnhub NO está en el repo**. Vive en *Script Properties* del Apps Script. Ver `apps-script/README.md`.
- La URL del Apps Script (`GAS_URL`) sí está en `index.html`. Es un endpoint público (un sitio estático es "view source" igualmente). Endurecerlo con un token compartido está en el backlog.

## 🗺️ Roadmap

Ver `CHANGELOG.md` (hecho) y `docs/ARQUITECTURA.md` (fases futuras).
