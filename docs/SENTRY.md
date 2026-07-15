# Sentry — guía paso a paso (Mi Cartera)

## ¿Es de pago?

**No obligatoriamente.** Sentry tiene:

| Plan | Qué incluye |
|------|-------------|
| **Trial 14 días** | Todo ilimitado mientras pruebas |
| **Developer (gratis para siempre)** | ~5.000 errores/mes — de sobra para uso personal/familiar |

Después del trial **no te cobran solos** si no metes tarjeta. Pasas al plan gratis con límite de volumen.

---

## ¿Para qué sirve?

Cuando la app **petardea en el móvil de alguien** (pantalla blanca, crash raro), Sentry te manda:

- mensaje del error
- versión de la app (3.109.0)
- móvil / navegador
- **sin** datos financieros del usuario

Es la “caja negra” en producción. Playwright prueba antes de publicar; Sentry avisa cuando falla en la calle.

---

## Configuración recomendada (sin instalar Sentry en el repo)

**No hace falta** la integración de GitHub de Sentry que te ofrece en “Get started”. Mi Cartera ya lleva el SDK embebido. Solo necesitas el **DSN**.

### Paso 1 — Crear proyecto

1. Entra en [sentry.io](https://sentry.io) (cuenta creada ✓)
2. En “Choose your SDK” elige **Browser JavaScript** (no Capacitor para la web/PWA)
3. Marca solo **Error monitoring** (5000 errors/mo en free)
4. **Continue** → te dan un **DSN** (URL larga)

### Paso 2 — Secreto en GitHub

1. GitHub → repo **Mi-Cartera** → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
   - Name: `SENTRY_DSN`
   - Value: pega el DSN completo
3. Guardar

### Paso 3 — Desplegar

Push a `main` → el CI inyecta el DSN al build → la web ya reporta errores.

### Paso 4 — Ver errores

Sentry → **Issues**. Cada crash aparece ahí con stack trace.

---

## ¿Y la integración GitHub de Sentry?

Opcional. Sirve para ver commits en cada error. **Puedes saltarla** (“Skip setup”) — la app funciona igual con solo el DSN.

---

## Local (opcional)

```powershell
cd "E:\Mi Cartera"
$env:SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
npm run build
```

Sin DSN: `mcInitSentry()` no hace nada.

---

## Regenerar vendor

```bash
npm run build:sentry
```

Ver también [TESTING.md](TESTING.md) para Playwright.
