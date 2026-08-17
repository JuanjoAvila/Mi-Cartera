# Brief Claude personal — destello temporada (Mi Cartera)

> ## ⚠ LEE ESTO ANTES DE PEGARLO (añadido 2026-08-17)
>
> **Este brief se escribió el 2026-08-05 contra `beta` en 4.15.0.12. La mitad de su «estado» ya
> es falso.** Lo que sigue valiendo es el **forense**; lo que hay que ignorar es el **punto de
> partida**.
>
> | Lo que dice el brief | Lo que hay de verdad hoy |
> |---|---|
> | «Tip remoto (roto): `3f9d6572` → 4.15.0.12» | `beta` va por **4.18.0.1**. Ese commit es de hace 12 días. |
> | «Hay cambios **sin commit** de un intento .13 — NO descartar a ciegas» | **No existen.** El árbol está limpio. No busques ese WIP. |
> | «Cómo empezar: `git diff src/shell.html src/modules/11-app-main.js`» | Devolverá vacío. |
> | «Done criteria 7: CI stamp **4.15.0.13+**» | Sería un bump hacia atrás. Parte de `VERSION` real. |
> | El .12 dejó al usuario furioso, sin arreglar | **Se arregló y él lo aprobó.** El 6/8 a las 00:14, en 4.15.0.19, cinco tandas de season con **0 fallos**: `fix-season-portal` («Destello y barra — arreglo definitivo», 3 ok), `fix-season-glow-steady` («Destello que no cambia nunca», 9 ok), `fix-season-glow`, `fix-season-glow-soft`, `fix-season-tabs` («Pestañas sin mezclarse», 4 ok). Compruébalo tú: `node scripts/errores.mjs --kind=beta`. |
>
> **Entonces, ¿qué es la tanda 8?** Una queja **posterior y distinta**, de la vuelta del crucero
> (commits `2babedb2` y `aeec4ad9`, 6/8 por la noche, en
> [`brief-crucero-verificar-pages.md`](brief-crucero-verificar-pages.md)):
>
> 1. **Parpadeo al cambiar de pestaña** en 4.15+ — se nota MÁS con temporada, **pero también sin**.
>    Confirmar con Temática **Ninguna** antes de tocar nada de season.
> 2. **Capa negra al tirar de Cartera más a la derecha** (overscroll) — sospecha del clamp del
>    gesto al volver.
>
> Misma familia (host transparente / compositing del WebView), **no el mismo bug** que el flash
> del .12. No empieces reproduciendo el .12: ya no pasa.
>
> **Lo que de este brief sigue siendo oro y hay que leer entero:** la línea temporal de intentos,
> los **9 descartados con evidencia** (sobre todo el 5: host transparente → Inicio+Gastos
> solapados), las causas reales demostradas, y las trampas de ADB/CDP (el `>` de PowerShell
> corrompe el PNG; `adb shell input swipe` no dispara el gesto de tabs). Eso no ha caducado.
>
> Y ojo con la lección de [`season-destello-saga`](../memoria/season-destello-saga.md): el Δ del
> píxel a secas mide el CONTENIDO, no el efecto. Hay que congelar el gesto con el dedo puesto y
> restar dos capturas.

**Modelo:** Claude **Opus** a potencia **alta / Ultra** (Code max si lo tienes).  
No uses Sonnet para esto: ya hubo varios “fixes” que pasaron tests/CSS y fallaron en el Oppo. Necesita razonar compositing WebView + no inventar otra cinta.  
**No uses fable.**

**Repo:** `E:/Mi cartera`  
**Rama:** `beta`  
**Tip remoto (roto en el móvil):** `3f9d6572` → stamp **4.15.0.12**  
**Referencia buena parcial:** `7c40d2fa` → **4.15.0.11** (barra OK + destello siempre visible; flash al scroll)  
**Anterior insuficiente:** `f589f89c` → **4.15.0.9** (solo subió opacidad + `nav-sin-blur` sólido; usuario dijo «sigue pasando ambos»)

Lee `AGENTS.md` entero. Edita `src/modules/*` + `src/shell.html`, luego `npm run build`. No edites `public/index.html` a mano como fuente. Push solo a **`beta`**. Textos en es/en/ca cristiano. Diálogos propios, no `alert`.

---

## Qué quiere el usuario (hoy)

1. **Barra inferior:** ya OK en .11 — lista NO se ve a través. **No regresionar.** `.botnav` fondo sólido `var(--bg-2)`, no `color-mix(88%, transparent)`.
2. **Destello:** suave, esquina arriba-derecha, **siempre** (en reposo está bien).  
   - NO más intenso que .11 en reposo.  
   - NO intensificar al scrollear.  
   - NO desaparecer al scrollear (.12 hizo esto y le cabreó).
3. **Notch / iconos junto a la cámara frontal:** mismo tono que el resto de la app (`var(--bg)`).  
   La cinta opaca de .12 dejó una franja oliva distinta → **inaceptable**.

Cita usuario sobre .12: «no solo le has agregado mas destello… cuando scrolleas no hay destello y me has jodido la parte de arriba de donde estan los iconos al lado de la camara… no se ve del mismo tono».

---

## WIP local (ya en el working tree — NO descartar a ciegas)

Hay cambios **sin commit** de un intento .13 a medias. Revísalos y completa/corrige con evidencia; no ignores el diff:

- `src/shell.html` — portal `z-index:34` (detrás del host 35); glow otra vez 38vh translúcido con `seasonglow`; host con `background-clip:content-box` (padding deja ver el portal); **quitado** horneado `html[data-season] .page-scroll-host{background:glow,bg}`.
- `src/modules/11-app-main.js` — comentarios actualizados; portal sigue a `document.body`.
- `tests/season-detalle.test.mjs`, `CHANGELOG.md`, `src/modules/10-app-components.js`, `public/index.html` (build).

**Hipótesis del WIP:** glow detrás del host + `background-clip:content-box` para que el padding muestre el destello fijo sin mezclar overlay encima del contenido que scrollea, y sin cinta en la status bar.

**Riesgos a verificar en dispositivo ANTES de cantar victoria:**
- ¿El padding del host deja ver glow o solo `body`/`--bg`?
- ¿La zona de la cámara sigue siendo solo `--bg`? (muestrear píxeles junto a iconos vs chrome abajo)
- ¿Al scrollear Δ RGB esquina ≈ 0–3? (antes .11 ~+30; .12 glow tapado por cards)
- ¿`background-clip:content-box` no abre agujeros raros / solapamiento de tabs? (hubo incidente: host transparente → Inicio+Gastos a la vez; el área de contenido del host DEBE seguir opaca `var(--bg)`)

Si el WIP no aguanta píxeles en el Oppo, cámbialo; no te cases con él.

También hay basura untracked en `tools/movil/_*.png` / scripts tmp — ignorar o no commitear.

Regla nueva (dejar): `.cursor/rules/claude-personal.mdc` (flujo Cursor↔Claude personal).

---

## Línea temporal de intentos (no repetir)

| Stamp / commit | Qué hizo | Resultado real en Oppo |
|---|---|---|
| `.9` `f589f89c` | `nav-sin-blur` + `background:var(--bg-2)`; subió alfas glow `.3–.42` | Usuario: **siguen ambos** problemas |
| `.11` `7c40d2fa` | Portal a `body` fuera de `#root`; `.botnav` siempre opaco; glow 38vh z-36 encima | **Barra OK.** Glow siempre visible (bien). Al scroll **flash** (~+23–33 RGB): contenido mint bajo overlay translúcido |
| `.12` `3f9d6572` | Cinta opaca `height:calc(safe-top+8)`; gradient horneado en host; sin animación opacity | **Notch otro tono.** Más glow pasivo. Al scroll glow **desaparece** (cards tapan fondo del host). Usuario furioso |

### Descartado con evidencia (no volver a probar como “fix”)

1. **Confiar en `getComputedStyle` `position:fixed` / `top:0`** — en .9 medía fixed y el píxel igual saltaba (glow dentro de `#root{position:relative}`).
2. **Solo subir opacidad / gradientes** — no arregla scroll-link ni flash.
3. **Congelar `seasonglow` / ocultar partículas** — el salto RGB al scroll **seguía**; animación y `.season-amb` NO eran la causa del flash.
4. **`html::before` como glow** — mismo mentiroso fixed-pero-scroll-linked.
5. **Host / page background transparente** para “ver” atmósfera — **Inicio+Gastos solapados**. Host content area SIEMPRE opaca `var(--bg)`.
6. **Cinta opaca corta en safe-area** (.12) — rompe tono notch; glow muere al scroll.
7. **Hornear `--season-glow-top` en `.page-scroll-host` background** (.12) — mismo: se tapa al scrollear; tiñe chrome.
8. **PowerShell `>` redirect de `adb exec-out screencap`** — PNG corrupto. Usar:  
   `cmd /c "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe exec-out screencap -p > tools\movil\_x.png"`
9. **`adb shell input swipe`** a veces no dispara el gesto de tabs de la app — usar CDP `Input.dispatchTouchEvent` / scripts en `tools/movil/cdp-swipe.mjs`, `verify-season-fix.mjs`, `png-pixel.mjs`.

### Causas reales ya demostradas

- **Lista tras barra al swipe:** `.nav-sin-blur` quitaba blur y dejaba el 12% transparente del botnav por defecto. Fix: sólido siempre (conservar).
- **Glow “aparece/desaparece” con scroll cuando vivía en `#root`:** compositor WebView Oppo liga fixed al scroll host.
- **Flash .11:** overlay translúcido **encima** del contenido; al pasar gráfico/cards el composite se aclara.
- **Glow se apaga .12:** ambiente en **fondo** del host → cards opacas lo cubren.

---

## Archivos clave

- `src/shell.html` — `.season-portal`, `.season-glow`, `--season-glow-top`, `.page-scroll-host`, `.botnav`, `nav-sin-blur`
- `src/modules/11-app-main.js` — `ReactDOM.createPortal(..., document.body)` + `season-portal`
- `tests/season-detalle.test.mjs` — guardas portal / botnav opaco / no cinta mala
- Package móvil: `com.micartera.app` (Oppo)

---

## Done criteria (obligatorio con capturas)

1. Píxel junto a iconos de status ≈ píxel chrome app (`var(--bg)`), Δ pequeño.
2. Top-right glow rest vs scroll mid: Δ RGB **≤ ~3** (no flash, no apagado).
3. Glow visible en reposo (temática Verano), sin ser más agresivo que .11.
4. Swipe tabs: botnav sólido (no se ve lista).
5. No solape Inicio+Gastos.
6. `npm run build` + `npm test` (o al menos season + syntax).
7. Commit + push `origin/beta` → CI stamp **4.15.0.13+**.
8. Usuario verifica: Mis bancos → sello nuevo; notch OK; scroll estable; barra OK.

---

## Cómo empezar

```text
cd "E:/Mi cartera"
git status
git diff src/shell.html src/modules/11-app-main.js
```

Revisa el WIP .13; mide en el Oppo; si falla, itera. No publiques otro “fix” sin píxeles ADB.
