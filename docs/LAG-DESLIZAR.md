# El lag al deslizar entre pestañas — expediente

> **Léete esto entero antes de tocar una línea.** Es el registro de una cacería de un día completo
> (2026-07-26 y 27) con **todo lo que se probó y NO funcionó, con su número**. La mitad del valor de
> este documento es evitarte repetir ocho experimentos que ya están hechos.
>
> Estado: beta **4.12.0.33** en el canal de pruebas. Producción (`main`) sigue en 4.11.0.

## 0. CÓMO ACABÓ: no era rendimiento, era un candado que no se soltaba (2026-07-27, noche)

**La app no iba lenta: se quedaba bloqueada.** Por eso un día entero de medir rendimiento no dio con
ello, y por eso ningún banco de pruebas lo reprodujo jamás.

Cuando el navegador decide que un arrastre es **suyo** (lo normal en cuanto el gesto acaba
scrolleando la lista), se lo lleva y avisa con **`touchcancel`** — y entonces **`touchend` ya no
llega nunca**. `.viewport` solo escuchaba `onTouchStart/onTouchMove/onTouchEnd`, así que por ese
camino no se ejecutaba nada de lo que suelta el gesto: ni `freezeShell(false)`, ni quitar
`.dragging`, ni devolver el carrusel a su sitio. La página se quedaba con **`touch-action:none`** (y
con `overflow:hidden` si venías de scrollear) y el carrusel **plantado a medio camino**.

Lo que se siente con eso puesto es exactamente lo que él lleva describiendo desde la .17: deslizas y
**no se mueve nada**; insistes; en cuanto un gesto termina bien se suelta todo de golpe y la pantalla
**pega el salto**. Y como el desbloqueo depende de que el siguiente gesto acabe limpio, sale «a
veces sí y a veces no».

**Medido en SU móvil, por CDP, la noche del 27** (no en un contenedor):

| | |
|---|---|
| Gestos suyos que acabaron en `touchcancel` | **174 de 185** |
| Tareas largas de JavaScript en 38 s de uso | **0** |
| Tras un gesto cancelado: dos deslizadas reales | scroll **473 → 473 → 473** (muerto) |
| Después de un gesto que acaba bien | **473 → 820** (revive) |
| Carrusel tras el gesto cancelado | `translate3d(-463px…)` — **entre dos pestañas**, ni una ni otra |

Esa última fila es, con toda probabilidad, el «**Gastos se queda a medio pintar / desvaído**» del §6:
no era el pintado, era el carrusel parado a mitad de camino enseñando dos pantallas a la vez.

**El arreglo** (`11-app-main.js`): `onTouchCancel` en `.viewport` (→ `onCancel`, que reutiliza
`cancelSwipe`) y en Ajustes (`drawerCancel`); `freezeShell(false)` suelta **las cuatro** páginas, no
solo la activa; red de seguridad en `onStart` por si un gesto muere sin avisar de ninguna manera (la
app se va a segundo plano con el dedo puesto); y **fuera `pageEl.style.touchAction="none"`**, que no
servía para nada —el navegador fija `touch-action` en el `touchstart`, cambiarlo con el dedo puesto
no afecta al gesto en curso— salvo para dejar la app muerta. Guardián:
`e2e/swipe-pestanas.spec.mjs` › «un gesto que el navegador cancela no deja la app bloqueada»
(comprobado que falla sin el arreglo).

**El método que lo encontró, que es lo que hay que heredar:** se compiló un APK igual al suyo (misma
firma, mismos datos) con `WebView.setWebContentsDebuggingEnabled(true)` en `MainActivity` **después
de `super.onCreate()`** —antes no vale: Capacitor lo apaga en release, `Bridge.java:599`— y se
inspeccionó su WebView por `adb` + CDP mientras él usaba la app. Dos avisos por el camino:

- **`dumpsys gfxinfo` MIENTE en una app WebView**: daba 112 fps y un solo frame malo en 33 s. Una
  WebView pinta siempre su último fotograma disponible, así que Android cuenta frames perfectos con
  contenido congelado. Para el ojo del usuario solo valen los deltas de `rAF` **dentro** de la página.
- **Grabar una traza de Chromium provoca el tirón que buscas**: con `Tracing` puesto salían frames de
  90 ms donde con un medidor ligero no salía ninguno. Medir primero con `rAF`; la traza, solo para
  mirar una ventana concreta y sabiendo que suma ruido.

## 1. Qué dice él, con sus palabras

Lo aprobado (**no lo vuelvas a tocar**):

- **La APK**: «lo de la APK ole, eso sí». La 35 se instala y el icono se ve.
- **Deudas → Cartera**: «se ha arreglado en dirección hacia Cartera, va fluidísimo».
- **El perfil**: «déjalo, ya está bien como está, no está en su punto prime a la velocidad que yo
  quería pero me conformo si no se puede más, **no quiero cambiar diseño ni nada**».

Lo que sigue abierto:

- **Deudas → Gastos.** Su repro literal, que es el dato más valioso del expediente:

  > «Cuando en Gastos está **arriba del todo** —esto es importante— y luego entras en Deudas, te
  > mueves en Deudas y luego vas hacia Gastos (recuerda, arriba del todo), hay lag y se ralentiza
  > todo. **En cambio** si estás en Gastos, **bajas** sin ver la parte de arriba, vuelves a Deudas,
  > te mueves por Deudas arriba y abajo, y luego deslizas otra vez a Gastos pero esta vez estás en
  > la zona de Gastos, no en la parte de arriba del todo: **no hay nada de lag, va ultra fluido**.»

- **«Gastos se queda a medio pintar / desvaído»** (vídeo del 26/7 a las 23:23). **Nunca se ha
  reproducido.** Ver §6.

## 2. La trampa que costó dos tandas enteras

**El banco de pruebas no reproducía su fallo, y yo no lo comprobé antes de optimizar.** Dos tandas
de arreglos «medidos» no le llegaron por esto. Dos causas:

1. **Se medían TAREAS LARGAS y su síntoma son TIRONES.** Un frame de 100 ms se nota muchísimo y
   puede no generar ninguna tarea larga. Hay que medir **deltas de `requestAnimationFrame`** y
   contar los frames > 32 ms.
2. **La app ignora los eventos de scroll mientras hay un dedo puesto** (`if(dragging.current)
   return` en `onPageScroll`, 11-app-main.js). Con toques sintéticos por CDP **no hay inercia**, así
   que la barra inferior no se escondía nunca — y el caso malo que él describe **no llegaba a
   existir** en el banco. Hay que simular la inercia: tras el `touchEnd`, un `scrollTop += N` por
   JS, que sí dispara el evento con `dragging` ya en false.

Con eso corregido, su fallo salió a la primera. **Antes de optimizar nada, comprueba que tu medida
distingue el caso bueno del malo que él cuenta.** (Regla ya añadida a `AGENTS.md` §7 bis.)

Otras trampas de medir aquí, todas pagadas ya:

- **El ruido del contenedor es ±100 ms.** Diferencias de 30 ms **no se resuelven** sin A/B
  **intercalado** (dos servidores, pasadas alternas A,B,A,B) y medianas de 7-9. Una tanda de 5
  pasadas seguidas miente: una idea del perfil parecía ganar (171 vs 215) y con 9 intercaladas
  salió **peor** (229 vs 166).
- **Playwright distorsiona**: `locator.click()` y `waitFor()` sondean el DOM. Usa `page.evaluate`
  con click crudo y esperas a ciegas.
- **`Profiler` a x12 distorsiona más de lo que mide**; usa `Tracing`. Para saber *qué* función
  corre, el `Profiler` a x4-x6 vale.
- El binario de Chromium va con `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`. **Sin esa
  variable `npm test` falla los 88 e2e en 4 ms cada uno** y parece que has roto la app: no es eso.

## 3. Lo que SÍ se arregló (medido y, parte, confirmado por él)

| Cambio | Efecto medido | Dónde |
|---|---|---|
| Las 4 páginas salen de un `useMemo`, fuera del render de `App` | abrir perfil 339 → 175 ms · esconder barra al scrollear 123 → **0 ms** | `11-app-main.js` (`contenidos`) |
| `tab` fuera de las dependencias de las páginas | entrar en Deudas 183 → 108 ms | íd. (ojo: `goTab`/`cancelSwipe` leen `tabRef`) |
| Segmentos ocultos de Plan con `content-visibility:hidden` **siempre** | entrar en Plan 162 → **89 ms** | `14-v4-screens.js` ← **él confirmó esto** |
| Filas de Gastos: se pasa `ms`, no un `Date` | `MovRow` pasa de 2,5 % del perfil a **no aparecer** | `04-tab-gastos.js` |
| Desenfoque de la barra apagado durante el gesto | 181 → 145 ms (tope teórico 141) | `navSinBlur` + `shell.html` |
| `revealNav` + `prepMount*` dentro del `startTransition` | peor frame del caso malo 100 → 83 ms | `goTab` |

Las dos últimas **están sin veredicto suyo**: la .33 es justo la que lo lleva.

## 4. Lo que se probó y NO era — no lo repitas

Todo esto está medido. Repetirlo es tirar tokens.

**Del perfil al abrir** (~175 ms, y él ya lo ha dado por bueno):
- Desacoplar el candado de scroll de `gesture-freeze`: 300 vs 310 ms. Ruido.
- `contain:paint` en el panel al arrastrar: 304 vs 300. Ruido.
- Quitar el velo del DOM: 223 vs 266. Quitar la sombra: 211 vs 266. Quitar la animación del
  avatar: 258 vs 266. Ocultar el contenido del panel: 317 vs 266. **Apagar TODAS las
  transiciones: 221 vs 266.** Y **quitar el panel entero del DOM: 195** — o sea que el coste no
  era el panel.
- `content-visibility:auto` en las tarjetas del perfil: **peor** (229 vs 166 con 9 intercaladas).
- El JS de la app **no llega al 1 %** al abrirlo. Lo que queda es pintado del navegador de una
  pantalla de ~1.680 px. Bajarlo pide enseñar MENOS panel, y eso él **no lo quiere**.

**Del desliz entre pestañas:**
- Quitar el `content-visibility` de los segmentos solo-al-arrastrar: 257 vs 236. Nada.
- Quitar el `content-visibility:auto` de `.page`: 252 vs 236. Nada.
- Quitar el `will-change` del `.track`: 212 vs 236. Ruido.
- Dejar `active` fijo en Gastos: quita la asimetría, **pero no vale** (haría que Gastos hiciera su
  trabajo caro en el arranque).
- Retrasar el aviso de «ya eres la pestaña activa» 460 ms: **empeoró**, 239 vs 165 (paga dos
  re-renders en vez de uno).
- Ocultar **todo** el bloque de arriba de Gastos (resumen, chips, suscripciones, progreso): **100 ms,
  igual que sin ocultarlo**. Por eso se sabe que **no es lo que se pinta arriba**.

**Y una corrección importante:** el desenfoque de la barra **no es la causa de su repro**. En su
caso lento la barra está *escondida*, o sea sin nada que desenfocar. La mejora de 181 → 145 es real
y el cambio se queda, pero **no era lo suyo**.

## 5. El hallazgo con el que se cierra el día

Separando el estado de la barra de la posición de scroll de Gastos (medido en frames):

| caso | peor frame |
|---|---|
| Gastos arriba + **barra escondida** (su caso lento) | **100-117 ms** |
| Gastos arriba + barra **ya visible** | 83 ms |
| Gastos bajado (su caso fluido) | 83 ms |
| Gastos arriba, **todo** el bloque de arriba oculto | 100 ms |

**La variable no es «Gastos arriba del todo»: es si la barra inferior está escondida y tiene que
REAPARECER durante el desliz.** Y explica su «a veces sí y a veces no»: dependía de si había
scrolleado antes. La causa encontrada —`revealNav()` urgente contra `setTab` en transición, o sea
dos renders de `App` encima de la animación— está arreglada en la .33 y **pendiente de su prueba**.

## 6. «Gastos se queda a medio pintar» — abierto, no reproducido

Se montó su camino (arrancar, esperar, deslizar a Gastos con el dedo, CPU x12, 1.200 gastos) y se
midieron filas y opacidad a los 120 ms, 500 ms y 2 s de soltar: **12 filas, opacidad 1, ninguna a
medias ni desvaída**. Sospechas sin descartar: el `content-visibility:auto` de `.page` cuando entra
una pestaña que aún no es `page-live`, y la paginación de la lista (12 filas + centinela) leída
como «lista a medias». **No lo toques a ciegas.** El veredicto de la beta dice ya la compilación y
la APK, así que lo primero es mirar con qué lo vio.

## 7. Lo siguiente que yo haría, por orden

1. **Esperar su veredicto de la .33.** Lleva el arreglo del render doble, que es el único candidato
   que ha salido de una medida que SÍ reproduce su caso.
2. **Si sigue igual: medidor DENTRO de la app, y se acabó adivinar.** Un modo dev que registre el
   peor frame de cada desliz (deltas de `rAF`, como el banco) y lo mande a `app_events` o lo pinte
   en Ajustes. Su WebView es la única máquina cuya opinión cuenta: este contenedor ya ha engañado
   dos veces, y un dato real suyo vale más que diez experimentos míos. **Es lo que propondría antes
   que cualquier otro cambio de código.**
3. **Sospechas vivas, sin comprobar** (ninguna medida todavía):
   - La transición del `.track` dura 0,42 s y la de la barra 0,55 s: **se solapan**, y la barra
     lleva `will-change:transform,opacity` + `backdrop-filter`. Probar a igualar/acortar la de la
     barra, o a no animarla cuando el cambio de pestaña viene de un gesto.
   - `useDeferredValue(state.expenses)` en `04-tab-gastos.js`: React puede renderizar Expenses
     **dos veces** al entrar. Medir si aporta algo hoy o solo cuesta.
   - `will-change` permanente en varios sitios (`.track`, `.botnav`, `.profile-pull`): cada uno es
     una capa de compositor viva. Contar capas y ver si sobra alguna.
4. **APK 36** cuando toque: el arreglo del vigilante de fondo para el canal de la APK es Java y
   **no viaja por OTA** (está ya en el repo, esperando compilación).

## 8. Herramientas

Los bancos de pruebas de esta cacería **no se han commiteado a propósito** (eran de usar y tirar, y
`AGENTS.md` §2 dice que no se deja código que no sirve). Reconstruirlos es media hora con lo de §2;
lo que importa —el método y las trampas— está en este documento y en `AGENTS.md` §7 bis.

Lo permanente que sí queda como guardián:

- `e2e/rendimiento-tabs.spec.mjs` — umbral en el caso del scroll (62-83 ms antes, 0 después) y
  estructural en el premontaje del perfil y en el `content-visibility` de los segmentos de Plan.
- `e2e/swipe-pestanas.spec.mjs` — que deslizar funcione, y que el desenfoque de la barra se apague
  con el dedo puesto y vuelva solo.
- `tests/updates.test.mjs` — el canal de la APK, con el fallo del 26/7 reproducido.
