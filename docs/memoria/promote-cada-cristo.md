<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (promote-cada-cristo.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: promote-cada-cristo
description: Por qué cada promote a prod con Cursor fue un calvario (2026-08-06) y el antídoto (release:apk + guardián WEBDEBUG)
metadata:
  type: project
  modified: 2026-08-06T20:15:00.000Z
---

# Cada promote es un cristo — causas y antídoto (2026-08-06)

Él está cabreado con razón: sacar 4.16.x a prod fue un rosario de fallos encadenados. Causas REALES:

1. **Promote de Actions encolado / HTTP 502** → hubo que mezclar `beta`→`main` a mano.
2. **`MICARTERA_WEBDEBUG=1` en local.properties** se coló en `assembleRelease` → APK firmada con socket de depuración; franja/chrome nativo bajo la cámara. Además se instaló/confundió el paquete `.debug` al lado de la real.
3. **Orden Wallet**: el servidor (Supabase/ingest) tiene que estar verde **antes** de prometer que la APK apunta gastos; si no, «Wallet listo» miente.
4. **`apk.json` apuntando a un release que aún no existía** (o a un versionCode viejo) → la familia no puede actualizar.
5. **Tag `beta` vs rama `beta`**: `git push origin beta` es ambiguo → usar `refs/heads/beta`.
6. **Outage de GitHub Pages/Actions** dejó live en 4.15.0 aunque `main` ya tenía 4.16.1.
7. **Falsas pistas** (batería ColorOS, «app de depuración») quemaron tiempo antes de pillar splash sin `postSplashScreenTheme` + WEBDEBUG.

## Antídoto (en el repo)

- Guardián Gradle: `assembleRelease` **falla** si `WEBDEBUG=1` salvo `ALLOW_WEBDEBUG_RELEASE=1` (solo CDP).
- `npm run apk:prep` llama a `scripts/guard-webdebug.mjs`.
- **`npm run release:apk`**: un solo camino (prep → assemble → aapt/firma → `gh release` → `apk.json` real).
- Circuito en **`docs/RELEASE.md`** y enlace desde `EMPIEZA-AQUI.md` / `AGENTS.md` §6.
- Test `tests/webdebug-guard.test.mjs` para que no se borre el guardián en silencio.

## Orden mental al publicar

beta OK en móvil → promote → **Supabase verde** → `release:apk` → commit `apk.json` → esperar Pages (`npm run salud`) → install. Si Pages está caído: APK en GitHub sí; OTA no — dilo claro, no inventes que live ya está.
