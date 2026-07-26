<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (mi-cartera-backlog.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: mi-cartera-backlog
description: Backlog explícito de "para más adelante, no ahora" de Mi Cartera — UX de Ajustes, tutorial en secciones, cuenta compartida/familiar
metadata:
  type: project
  originSessionId: c4de242d-80ef-4366-a5a3-e9be47a4c292
  modified: 2026-07-26T11:46:19.639Z
---

Tareas que el usuario pidió apuntar como futuras (2026-07-12, sesión "3.95.0/3.95.1 + alpha16") explícitamente **NO para hacer ahora**. Ver [[mi-cartera-roadmap]] para lo que sí se hizo esa sesión.

## 1. Ajustes kilométrico — ✅ HECHO en v3.97.0 (2026-07-13)
Grupos colapsables + buscador, ver [[mi-cartera-roadmap]]. Queda como posible segunda pasada: separar «básico vs avanzado» ligado al Modo sencillo, si el usuario lo vuelve a pedir.

## 2. Tutorial en bloques pequeños por tema — ✅ HECHO en v3.97.0 (2026-07-13)
Mini-tutoriales por pestaña (TabCoach): primera visita desplegado + botón «💡 ¿Cómo va esto?» permanente. La categoría 💇 Peluquería también entró. Ver [[mi-cartera-roadmap]].

## 4. "Cuenta compartida" / visibilidad entre personas de la misma pareja o familia
Petición real, sin forma aún. Contexto que dio el usuario: sus padres tienen a la vieja usanza **una sola cuenta de CaixaBank para los dos** (comparten todo, ven el gasto del otro). Él les montó Revolut (su madre) + Trade Republic (su padre, con ETF FTSE All World + round-up + inversión automática + transferencia mensual desde CaixaBank) — pero TR y Revolut **no dejan compartir cuenta entre dos personas** (aún; TR podría añadirlo, "se están rallando" según el usuario). El deseo es poder replicar en Mi Cartera esa sensación de "vemos el mismo dinero" aunque las cuentas reales sean individuales.
- Ángulos posibles a explorar cuando se retome (sin decidir nada, apuntar para pensarlo con el usuario):
  (a) **Ya existe la pestaña "Compartido"** (grupos con balances/liquidación tipo Splitwise) — pero es para repartir GASTOS puntuales de un evento, no para ver el patrimonio del otro en vivo. Reutilizar su modelo de "grupo" pero con alcance distinto (visibilidad, no liquidación) sería otra feature, no una extensión trivial.
  (b) **Un "hogar"/"familia" como entidad**: varias cuentas de Supabase (uid distintos) comparten un `household_id`; el patrimonio/dashboard se puede ver en modo "solo mío" o "el hogar" (suma o vista lado a lado). Requiere RLS nueva y decidir qué es privado (¿los gastos variables de cada uno siguen siendo suyos, pero el patrimonio se ve compartido?).
  (c) Más simple: un **link de solo-lectura** que un usuario genera para que su pareja vea su Patrimonio (sin poder editar), sin fusionar cuentas de verdad. Bajo riesgo, no toca el modelo de datos de nadie.
  El usuario no sabe cómo enfocarlo ("no se como aplicar algo similar sabes?") — la próxima sesión sobre esto debe EMPEZAR preguntándole qué le importa más: ¿ver el número final (patrimonio total) o ver el detalle (cada gasto del otro)? Eso decide entre (b) y (c).
  **ACTUALIZACIÓN 2026-07-12:** el usuario va a hablar primero con sus padres (los del caso real: CaixaBank compartida + Revolut/TR separados que él les montó) para ver qué quieren ANTES de que tengan la app instalada. Él mismo predice que le van a decir "tú eres el informático, lo que tú quieras" — es decir, probablemente la decisión de diseño recaerá en él igualmente. NO empezar a implementar esto sin que él lo retome explícitamente.
  **RETOMADO por el usuario 2026-07-12 (sesión 3.96.0), punto #6:** "mis padres quieren poder ver todas las cuentas de ambos en sus respectivas apps... como pueden hacer con la caixa, a ver qué me puedes montar". O sea: visibilidad MUTUA de cuentas/patrimonio entre dos usuarios de la app. NO se implementó esta tanda a propósito: toca RLS sobre datos financieros de dos cuentas (riesgo de fuga de datos) y hay una decisión de alcance que es SUYA. Se le presentó en el resumen un DISEÑO con recomendación: **variante «hogar de solo-lectura por código»** (tabla nueva aditiva, cada uno publica un snapshot sanitizado de su patrimonio y el otro lo ve read-only con un código; NO toca la RLS de app_state; sin fusionar cuentas). Alternativas: (a) reusar pestaña «Compartido», (b) «household_id» con RLS compartida (más potente, más riesgo), (c) link read-only.
  **ALCANCE DECIDIDO por el usuario 2026-07-13: se comparte TODO** («como tienen en la caixa»): patrimonio, cuentas una a una, gastos del día a día y fijos. UX que él describió: sección «Hogar» (en Ajustes u onboarding) donde añades miembros y aceptas «¿quieres compartir todos los gastos, patrimonio y gastos fijos con esta persona?»; lo que apunta uno lo ve el otro; «lo que le sume a uno se lo sumará al otro». Exclusivo para parejas/padres que comparten absolutamente todo. Él mismo reconoce que DES-compartir después «está jodido» y no sabe cómo se haría. Diseño propuesto por Claude en la respuesta 2026-07-13: **hogar espejo de solo-lectura mutua** — cada uno sigue siendo dueño de SU estado; el hogar añade una VISTA fusionada (suma de patrimonios + timeline de gastos de ambos etiquetada por persona), implementada con snapshots publicados por cada miembro (tabla household + household_members + snapshots sanitizados), NO con escritura cruzada en el app_state del otro. Ventajas: des-compartir = borrar la fila (trivial), sin riesgo RLS sobre datos maestros, sin conflictos de sync. Lo que NO cubre: editar los datos del otro (aceptable: cada padre apunta lo suyo, como en CaixaBank cada uno mueve su tarjeta). PENDIENTE: OK del usuario al diseño → construir Fase 1 (crear hogar + invitar por código + vista Patrimonio fusionado), Fase 2 (gastos día a día fusionados). Necesita 2 cuentas reales para probar.

## 5. Tanda «finanzas del día a día» — al usuario LE GUSTAN TODAS (apuntadas 2026-07-13, sesión post-3.97.0)
Ideas propuestas por Claude que el usuario pidió apuntar expresamente («apuntame todas estas cosas para hacer que me gustan»). Ninguna empezada aún:
1. **Modo «fin de mes en paz»** — proyección diaria «a este ritmo acabarás el mes con +X €» con aviso proactivo si va camino de pasarse. El motor de cash-flow ya existe; es juntar piezas.
2. **Presupuesto por categoría** — límite opcional en Súper/Bares/Ocio con barrita de progreso propia (su pareja lo usaría seguro, dijo Claude y él no lo negó).
3. **Informe mensual automático** — el día 1, resumen del mes cerrado (notificación/tarjeta): gastado vs presupuesto, categoría culpable, ahorro real del ciclo.
4. **Widget de Android** — saldo + «te quedan X €» en pantalla de inicio sin abrir la app (Capacitor lo permite).
5. **Recordatorio de recibos gordos** — «mañana pasa el seguro (230 €) por CaixaBank» si el saldo proyectado no llega.
6. **Exportar informe PDF/imagen del mes** para WhatsApp (encaja para sus padres).
Recomendación de Claude en su día: arrancar por 1+2 juntas (mismo territorio). Compite en prioridad con Hogar Fase 1 (§4).

## 6. Peticiones del usuario 2026-07-15 (tras cerrar la saga TR) — 1 y 2 ya CERRADAS en 3.100.0
Lo que se hizo está en [[mi-cartera-roadmap]] (3.99.0 y 3.100.0). Queda pendiente:
1. **Revolut a medias** — ✅ HECHO en v3.100.0 (2026-07-15). La sospecha era correcta: extracto APARTE (Invest → Documentos → **Materias primas** → Extracto de cuenta). Ver [[mi-cartera-roadmap]].
2. **«Cuadro» de amortización con la estética de la app** (petición de su PAREJA) — ✅ HECHO en v3.100.0. **Se refería al cuadro de DIÁLOGO, no al cuadro de amortización**: el `window.prompt()` nativo de Android. Lo confirmó él con una captura. Ver [[mi-cartera-roadmap]].
3. **Notificación push de nueva versión** — para que su pareja se entere de que hay update sin que él se lo diga. Necesita infra (FCM/OneSignal) — proyecto aparte, no trivial.
4. **Planes de pensiones (CaixaBank) y cuentas de ahorro** — sacado de críticas de otras apps que él leyó para informarse. Toca Open Banking / scope nuevo.
5. **Todas las monedas** — hoy solo EUR/USD. No lo necesita él ni su círculo; lo pide «para un futuro» si otra persona lo usa.
Nota: el **informe mensual** (§5.3) «le encanta» a su pareja → sube de prioridad.

## 7. Review externa de ChatGPT (2026-07-25) — la tabla vive en `docs/ROADMAP.md`
El usuario pidió una review del repo a ChatGPT (arquitectura 9, CI/CD 9,5, tests 9) y preguntó qué apuntar «para llegar al 10». **La mitad de lo que propone ya está hecho** (feedback en la app, Sentry, paginación de listas, memoización, rate limit en `ingest`/`myinvestor-connect`) — la sección «Review externa» de `docs/ROADMAP.md` separa estado real vs tarea, con la prueba de cada «ya está», para no volver a proponerlo.
Lo que falta de verdad: **beta con más de un móvil** (hoy el canal es solo el suyo), analítica de uso (hoy `app_events` solo guarda errores + un ping), validar la entrada de las diez Edge Functions, auditar qué acaba en los logs, separar la lógica financiera de React, importador **PDF**, backup automático **con restauración probada**, e interfaz común de bancos (adapters). Play Store / cobrar → [[mi-cartera-escalado]]; antes de cobrar, gestor fiscal.

**Segunda tanda de la misma review (2026-07-26)**, más de operación que de producto — tabla nueva en `docs/ROADMAP.md`. Aceptado: **script `npm run salud`** (NO pantalla: con 3 usuarios una pantalla es un producto más que mantener; precedente `scripts/errores.mjs`), **`docs/adr/`** solo retro y solo decisiones caras (Supabase vs Firebase, monolito, cero CDNs, OTA propio vs Capgo), **threat model** de una página (útil porque alimenta las dos filas de seguridad ya pendientes). Repetido: **métricas funcionales** = «Analytics de uso» — pero barato, `Core.logEvent(kind,…)` de `00-core.js` ya tiene RLS solo-admin + tope + dedupe, así que es un `kind` nuevo + vista SQL; instrumentar YA porque el histórico de uso no se recupera hacia atrás. **Rechazado a propósito** (y escrito para no rediscutirlo): **tercer canal Experimental** (multiplica la matriz de release que reventó en 4.10.1/4.10.2; lo que falta son más móviles, no más canales), **feature flags ahora** (ya hay canal beta + `is_admin`; ramas muertas en el monolito — recuperar cuando la beta tenga varios móviles), **observabilidad de Edge Functions/SQL** (el panel de Supabase ya la da gratis; solo construir lo que pasa en el móvil: duración de sync e import).

## 8 bis. NOMBRE NUEVO — decidido 2026-07-26, pendiente de elegir
**«Mi Cartera» se cambia antes de publicar en Play.** Ya existe una app «Mi Cartera» de finanzas personales en Play (`com.support_tech.micartera`) y el Gobierno tiene «Cartera Digital Beta». Un nombre descriptivo no se puede registrar y en Play es invisible. Él eligió «buscar nombre nuevo». Los candidatos se comprueban en Play + App Store + dominio + OEPM/EUIPO antes de proponérselos; la elección es SUYA y el registro real lo confirma un agente de la propiedad industrial. Bloqueante de Play Store, no de la beta. Ficha en `docs/ROADMAP.md`.

## 8 quater. COLA DE LA PRÓXIMA SESIÓN — rechazo de la 4.12.0.18 (2026-07-26). En este orden:
1. **El lag** (ver 8 ter, es el mismo que sigue sin arreglar). Él: «por lo que te dije antes».
2. **Banco caído: ni redirige ni se ve rojo.** «Ahora sí marca que hay 3 bancos conectados y 1 falla, pero ni me redirige ni me marca dónde tengo que ir —**eso fue de versiones pasadas, te lo dije para mi padre** para que fuera más sencillo— y cuando voy a bancos, **todos salen en verde**». Es una REGRESIÓN de algo que ya funcionaba (4.7.x). Sospecha: el fallo de Sabadell no cae en `bankIssuesOf` (solo devuelve expired/noacct) así que no hay `issues` que disparen el evento `mc-open-banks`; y «Mis bancos» pinta por `status` de la tabla, no por el resultado de la última sync.
3. **El panel de beta marca 6/7 al abrirlo sin tocar nada.** Dos hipótesis: (a) enviar el veredicto NO limpia las marcas (los 6 cuadran con los 3 ok + 3 ko de la .17) → limpiar al enviar; (b) `storeKey` lee `CONFIG.APP_VERSION` antes de que el updater aplique la de la beta y cae en la clave de la base. Medir cuál.
4. **Icono: él no lo ve todavía.** Normal si aún no ha instalado la **APK 35** ([prerelease v4.12.0-beta35](https://github.com/JuanjoAvila/Mi-Cartera/releases/tag/v4.12.0-beta35), publicada y verificada: firma CN=Mi Cartera + bundle sellado 4.12.0). Confirmar que la instaló ANTES de tocar nada de iconos. ⚠ **El APK se puede compilar desde este equipo**: SDK en `%LOCALAPPDATA%\Android\Sdk`, firma en `android/local.properties`, JDK en `C:\Program Files\Android\Android Studio\jbr` (no hay `java` en el PATH, hay que exportar `JAVA_HOME`). Ojo: `--` no se puede usar dentro de un comentario XML de Android, rompe `mergeReleaseResources`.
5. Lo bueno: **«— No lo puedo probar» funciona** (el veredicto .18 ya trae `noProbable:1`) y el reseteo de mensajes por compilación también.

## 8 ter. LO PRIMERO: el lag que SIGUE (rechazo de la 4.12.0.17, 2026-07-26)
Palabras suyas: «Al entrar en metas o deudas, si luego deslizas entre tabs sin hacer nada, no pasa nada. El problema viene si por ahí **te mueves** en metas o deudas y luego **inmediatamente haces scroll hacia las otras tabs**: se laguea una barbaridad». O sea: el montaje de pestañas YA está arreglado (0 ms medidos) — lo que queda es **interactuar/scrollear dentro de la pestaña y deslizar acto seguido**. A medir con CPU x6 (AGENTS §7 bis). Sospechas sin confirmar: `onPageScroll` disparando estado (revealNav/navHidden) que re-renderiza App entera, o el momentum del scroll peleándose con el gesto.

**Nombre — segunda ronda pendiente.** Rechazó Zurrón/Alforja/Brújula/Guardabienes («no me gustan nada»). El brief nuevo (suyo vía ChatGPT, y tiene razón): la metáfora era «bolsa donde guardar cosas» y hay que subir a **crecer / patrimonio / horizonte / rumbo / progreso / legado**; y decidir si el nombre debe funcionar también en inglés por si internacionaliza. Ojo al lado malo de esa lista: son palabras muy usadas en marca financiera (rumbo.es es una agencia de viajes grande) y descriptivas = marca débil.

## 9. Sugerencia de su pareja — CERRADA 2026-07-26
«Se podría hacer el acceso a la configuración además de deslizar, darle un click en la cartera que hay arriba.» Hoy tocar el avatar YA abre el perfil (el gesto solo entra si hay movimiento, así que un toque limpio no se lo come) y desde ahí se va a Ajustes. Trece versiones después no está claro a qué «cartera de arriba» se refería. **Preguntarle a ella antes de tocar nada.**

## 8. LO PRIMERO DE LA PRÓXIMA SESIÓN (apuntado por él 2026-07-26, se quedaba sin tokens)
1. **Reescribir `RELEASE_NOTES` en cristiano y genéricas** — ver [[feedback-release-notes-siempre]]. Las de la 4.11.0 están vivas en producción y le hablan a él («lo que rechazaste», canal de pruebas, px, identificadores). Las lee su padre y su pareja.
2. **Tirón al deslizar entre pestañas, al principio.** Lo vio EN DIRECTO en el móvil de su pareja: las primeras veces que deslizas lateralmente entre tabs va a tirones, luego se suaviza. Huele a montaje perezoso de las pestañas (`prepMountTab` / `React.memo`) o al primer render de listas grandes cayendo dentro del gesto. **Medir antes de tocar** (AGENTS §7 bis: A/B contra `main`, y el gesto se ve en `11-app-main.js` — `onMove`/`onEnd` del track). Pista de la sesión del perfil: los `onTouch*` de React son PASIVOS.

## Pendiente sin fecha: repasar issues del Project v2
El usuario pidió una lista de qué issues quedan abiertas en https://github.com/users/JuanjoAvila/projects/1 — pero lo dejó para OTRA sesión (se quedaba sin tokens en esta). Al retomarlo: repasar el Project v2 con `gh` (issues #1-#10, varios ya cerrados: multiusuario #5, widgets #7, APK #8) y decir cuáles siguen abiertas de verdad.

## Investigación pendiente de decisión (no backlog de features, pero relacionado)
- Sync Revolut/MyInvestor: ver sección "SYNC INVERSIONES" en [[mi-cartera-escalado]] — pendiente de que el usuario decida import CSV/Excel (recomendado, ya) vs spike de la API no oficial de MyInvestor.
