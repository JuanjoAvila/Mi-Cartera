# Empieza aquí

Lee esto **antes de tocar nada**, seas Claude Code (PC o móvil), Cursor, o cualquier otro.
Son cinco minutos que ahorran medio presupuesto de tokens. Está escrito porque el 26/7/2026 una
sesión del móvil se gastó la mitad trabajando sobre una rama equivocada.

## 1. Lo primero, siempre

```bash
git fetch --all --prune && git log --oneline -5 refs/heads/beta && cat VERSION
```

**El trabajo vivo está en `beta`, no en `main`.** `main` es lo que usan su padre y su pareja, y
suele ir una versión por detrás. Si cortas una rama de `main` estás trabajando sobre código viejo:
tus arreglos ya pueden estar hechos, y tu bump de versión le BAJARÍA la versión a la gente.

## 2. Las cinco trampas que más caro salen

1. **`beta` es rama Y tag a la vez.** El tag lo usa el workflow del canal de pruebas para publicar
   los assets, así que **no se borra** aunque apunte a un commit viejo. Efecto diario:
   `git push origin beta` falla con «src refspec beta matches more than one» → usa
   `git push origin refs/heads/beta:refs/heads/beta`. Igual con `git log beta` → `refs/heads/beta`.
2. **La versión canónica es el fichero `VERSION`**, no `package.json`. Bumpear solo `package.json`
   es un fallo silencioso: el deploy sale verde y el móvil no se entera de nada.
3. **La fuente es `src/modules/*.js` + `src/shell.html`.** `public/index.html` es el ARTEFACTO que
   genera `npm run build`. Editar `public/index.html` a mano se pierde en el siguiente build.
4. **`npm test` falla en `docs-frescura` en cualquier rama que no se llame literalmente `beta`.**
   Es la excepción por diseño («no hay código publicable sin subir VERSION»), no es tu commit.
5. **En un portátil no se ven los problemas de rendimiento del móvil.** Cero tareas largas hasta
   estrangular la CPU x6 por CDP. Método completo y trampas en `AGENTS.md` §7 y §7 bis.

## 3. Cómo se publica

| Quieres… | Haces |
|---|---|
| Que lo pruebe él en su móvil | push a `beta` → el workflow publica el bundle en la release `beta` |
| Subirlo a producción | workflow «Promocionar beta a producción» (`gh workflow run promote-beta.yml -f confirmar=SUBIR`) |
| Cambiar algo NATIVO (iconos, Java, permisos) | hace falta **APK nueva**: no viaja por OTA |

**No se promociona nada sin que él lo apruebe** desde Ajustes → «Revisar esta beta».
El veredicto se lee con `node scripts/errores.mjs --kind=beta`, y las sugerencias que escribe la
familia desde la app con `npm run sugerencias`. **Míralas al empezar**: dos de su pareja pasaron
diez días sin que las leyera nadie, y una era un bug de verdad.

## 4. Cómo se escribe para él

- **Las notas de versión (`RELEASE_NOTES`) las lee toda la familia.** Genéricas y en cristiano:
  ni dirigidas a él, ni de la cocina (betas, canales), ni técnicas (px, identificadores). El porqué
  técnico va al `CHANGELOG`, que ahí sí se quiere con detalle. Regla y ejemplos en `AGENTS.md` §4.
- **Toda versión publicada lleva su entrada**, también las `.1`. Y en **es/en/ca**.
- **Nunca «no se puede».** Se investiga hasta encontrar una vía y se presentan opciones.
- **Nunca editar ficheros con PowerShell** (`Get-Content|Set-Content` corrompe el UTF-8 y mete BOM:
  costó un APK inservible ya publicado a su familia). Usa las herramientas de edición.

## 5. Todo lo que se sabe está aquí, no en la cabeza de nadie

`docs/memoria/` es el espejo de la memoria del agente: el histórico de por qué se decidió cada
cosa (la saga de Trade Republic en frío, los tres intentos del gesto del perfil, la estrategia de
escalado, el backlog largo) y cómo le gusta trabajar a él. **Se regenera con `npm run memoria` y
`npm test` avisa si se ha quedado atrás.** Está tachado de datos personales porque el repo es
público — si añades un tipo de dato nuevo, añade su filtro en `scripts/sync-memoria.mjs`.

Si aprendes algo que le habría ahorrado tiempo a la siguiente sesión, **escríbelo aquí mismo**.
La norma completa está en `AGENTS.md` §6 ter.

## 6. Estado y pendientes

`docs/ROADMAP.md` es la foto de ahora: qué versión va por dónde, qué está hecho y qué falta.
`CHANGELOG.md` es el porqué de cada cosa. `AGENTS.md` son las reglas de la casa.
Los tres se mantienen al día en cada tanda — si no cuadran con `VERSION`, `npm test` te lo dice.

**Hoy (2026-07-27):** `VERSION` = **4.12.0** en rama `beta`, lista para que la
re-pruebe en el móvil. Producción (`main`) sigue en **4.11.0**. Además de los bloqueos de los
rechazos .17/.18, esta tanda cierra dos de las tres cosas que quedaban abiertas:

- **Abrir el perfil, 339 → 175 ms** (y esconder la barra al hacer scroll, 123 → **0 ms**). La
  causa NO era la animación del panel: era que las cuatro páginas se construían dentro del render
  de `App`. Todas las hipótesis descartadas están en el `CHANGELOG` **con su número**.
- **La APK ya puede pasar de la 34 a la 35**: `beta.yml` no subía `apk.json` a la release `beta`,
  así que el móvil en canal de pruebas leía el manifiesto de producción y se callaba.
- **Mañana del 27, con su prueba delante:** APK aprobada por él. Deudas seguía mal y **no era lo que**
  **parecía**: no es «salir de Deudas», es **Plan entero** (58 ms saliendo de Gastos contra 187 entrando
  en Plan). Sus tres segmentos se ocultaban con `visibility:hidden`, que sigue pintando. Ahora llevan
  `content-visibility:hidden` siempre: **entrar en Plan 162 → 89 ms**.
- **Y la tercera vuelta:** el lag dependía de la DIRECCIÓN (hacia Gastos sí, hacia Cartera no), y eso
  destapó que **`parseDate` devuelve un `Date` nuevo cada vez**, lo que rompía el `React.memo` de las
  filas de Gastos desde siempre. Si pasas una fecha como prop, pasa el NÚMERO.
- **El perfil se queda como está** (~175 ms), y él lo ha dado por bueno: «me conformo, no quiero
  cambiar diseño». No lo toques. No es JS. Todas las palancas CSS están medidas y
  descartadas: el siguiente tramo pide enseñar MENOS panel al abrir, no pintarlo más rápido.
- **Sigue abierto**: «Gastos se queda a medio pintar». **No se ha reproducido** — está medido en el
  `CHANGELOG` y en `docs/ROADMAP.md` («Abierto, con lo medido»). No lo toques a ciegas.

⚠ `docs/memoria/pendiente-manana-4-12-0.md` retrata cómo se cerró la noche ANTES de esta tanda, y
es un espejo generado (`npm run memoria`, no se edita a mano): dos de sus tres puntos ya están
hechos. **La foto de ahora es `docs/ROADMAP.md`.**

Detalle y checklist en `docs/ROADMAP.md` y `docs/TESTING.md`. **No promocionar sin su OK** en el panel.

La cola post-rechazo de una beta (qué falló en el móvil y en qué orden arreglarlo) vive en
`docs/memoria/mi-cartera-backlog.md` (§8 ter / §8 quater / siguientes). El header del ROADMAP
puede ir un paso por detrás del último veredicto: **mira el backlog** antes de asumir que está
«pendiente de su primera prueba».
