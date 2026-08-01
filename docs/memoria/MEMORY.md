<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (MEMORY.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

# Memoria — Mi Cartera

- [Memoria SIEMPRE al repo](feedback-memoria-siempre-al-repo.md) — ⚠ `npm run memoria` tras escribir aquí; él trabaja también desde el móvil y con otras IAs, y el repo es PÚBLICO (el script tacha datos personales).

- [Leer sus veredictos ANTES de tocar código](feedback-leer-sus-veredictos-primero.md) — ⚠ `node scripts/errores.mjs --kind=beta` lo PRIMERO; el 1/8 le entregué un informe sin mirar dos tandas que ya había rechazado. Hacerle repetir un fallo es lo que más le quema.
- [Canal beta SIEMPRE](feedback-canal-beta-siempre.md) — ⚠ nada que él note va a `main` sin pasar antes por la rama `beta` y su OK; deroga el «push directo».
- [Despliegue y fuente única](mi-cartera-deploy.md) — public/index.html es la fuente; CI hace stamp+minify; SW stale-while-revalidate; sin CDNs de terceros (vendor/fonts locales); push directo al acabar. ⚠ La versión canónica es el fichero `VERSION`, NO package.json.
- [Fase 1 Supabase](fase1-supabase.md) — migración a BD+funciones+login (magic link, todo el estado a la nube).
- [Roadmap](mi-cartera-roadmap.md) — **v4.13.0.10 en `beta`, 26 puntos en 5 tandas** (import, gestos, arranque, bancos, canal); producción = **4.12.1** + APK 35. Los 5 fallos que rechazó (rebote≠Ajustes, rayita en diagonal, splash sobre la app pintada, temporadas largas, recaída al cambiar tab) **ARREGLADOS el 1/8**, pendientes de su prueba. TR por Open Banking CONVIVE con el puente nativo. ⚠ Las tandas van mezcladas en `beta`: esta ronda solo sube ENTERA (`npm run salud` lo avisa). Era v4 (3.101→4.0.10) la hizo CURSOR.
- [Depurar su móvil de verdad](depurar-webview-en-su-movil.md) — adb+CDP sobre su WebView; ⚠ `gfxinfo` miente en apps WebView y grabar la traza provoca el tirón que buscas.
- [Saga TR en frío](tr-frio-saga.md) — Cap.1 ✅ CERRADO (alpha18: Android tira cookies de sesión al matar la app; snapshot/restore tr_*). **Cap.2 (2026-07-17): TR ROTA tr_refresh en cada /session → el snapshot rancio «resucitaba» un refresh consumido → 401 real.** Fix en d404d8e (restore solo jar frío + snap tras refresh/onPause/onPageFinished) — pendiente APK 28 + verificación en frío. Dentro: espía CDP reutilizable.
- [Escalado y monetización](mi-cartera-escalado.md) — estrategia por fases (Open Banking gratis vía Enable Banking, OTA Capgo, hosting Cloudflare privado, Play Store, legal); el usuario tiene miedo, todo se prueba barato y reversible.
- [Coste de tokens y Cursor](feedback-coste-tokens-cursor.md) — se queda a medias y le fastidia; localizar con Grep en vez de leer el monolito de 870 KB. Reglas de la casa en `AGENTS.md` (raíz), que Cursor lee solo. No recortar: pruebas reales, 3 idiomas, RELEASE_NOTES.
- [NUNCA editar ficheros con PowerShell](feedback-nunca-editar-con-powershell.md) — `Get-Content|Set-Content` corrompe UTF-8 y mete BOM; costó un APK inservible publicado a su familia. Usar Edit/Write.
- [NUNCA decir "no se puede"](feedback-siempre-se-puede.md) — investigar hasta encontrar una vía; presentar opciones, no cierres.
- [RELEASE_NOTES siempre](feedback-release-notes-siempre.md) — toda versión publicada (incluidas .1) lleva su entrada en el popup de Novedades. ⚠ **TONO (2026-07-26): genéricas y en cristiano, NUNCA dirigidas a él ni técnicas** — las lee toda la familia; las de la 4.11.0 son el contraejemplo y hay que reescribirlas.
- [Modelos dinámicos](feedback-modelos-dinamicos.md) — el usuario autoriza subagentes con modelo más barato (haiku/sonnet) para subtareas mecánicas; el hilo principal no puede auto-cambiarse de modelo (él puede con /model). Push directo al acabar cada tanda (ver deploy).
- [Backlog "para más adelante"](mi-cartera-backlog.md) — incluye la **review externa de ChatGPT (2026-07-25)**: la mitad ya estaba hecha, tabla estado-real vs tarea en `docs/ROADMAP.md`. Peticiones vivas tras la 3.100.0: push de nueva versión (necesita FCM), planes de pensiones/ahorro, todas las monedas. Más: las 6 ideas de finanzas del día a día (informe mensual = favorito de su pareja) y el Hogar/cuenta familiar (alcance decidido, diseño pendiente de su OK). Cerradas en 3.100.0: oro de Revolut y el «cuadro» de amortización (era el DIÁLOGO, no la tabla).
