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

> **Atajo para las cinco de golpe: `npm run salud`** (desde 4.13.0). Contesta en veinte segundos
> lo que si no se comprueba a mano: si los cuatro sitios donde vive la versión cuadran, si la APK
> anunciada existe de verdad, **qué sirve producción ahora mismo** (preguntándole a Pages, no
> leyendo el repo), si la beta va por delante o por detrás, y qué commits hay en `beta` sin
> promocionar. Empieza por ahí antes de tocar nada.

> **Y si los e2e no arrancan por el navegador** («Executable doesn't exist at …»), no lances
> `npx playwright install`: en los entornos con Chromium ya instalado se apunta al que hay con
> `PLAYWRIGHT_CHROMIUM_PATH=/ruta/al/chrome` (la config lo lee). Instalar otro se come el disco y
> tarda diez minutos para nada.

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

**Hoy (2026-08-01):** `VERSION` = **4.13.0** en rama `beta`, pendiente de su veredicto en el panel.
Producción (`main`) va por la **4.12.1** (APK 35, que es de la 4.12.0: la .1 viajó por OTA).
Antes de leer nada más, lanza **`npm run salud`**: te dice esto mismo pero comprobado.

- **El tirón al deslizar y el stopper del perfil están CERRADOS**, dichos por él desde el móvil
  («arregladísimo» los dos). `docs/LAG-DESLIZAR.md` se queda por lo que enseña sobre **cómo medir**
  el rendimiento en su móvil de verdad, no porque quede nada pendiente ahí.
- **La 4.13.0 lleva cuatro tandas** (`import`, `gestos`, `arranque`, `bancos`), cada una con su
  botón en «Revisar esta beta». ⚠ **Pero sus commits van mezclados en `beta`, así que esta ronda
  solo puede subir ENTERA** (`tandas` vacío en el workflow). Para poder trocear la SIGUIENTE, cada
  tanda tiene que nacer en su rama `tanda/<id>` **antes del primer commit** — regla y motivo en
  [`docs/TESTING.md`](docs/TESTING.md).
- **Lo gordo de la tanda `bancos`** salió de probar con dinero real: gastos apuntados como ingresos
  al conectar Trade Republic por Open Banking, recibos duplicados del histórico (una factura de 3
  meses creaba 3 Fijos que se cobraban los 3 cada mes) y el banco de gasto diario que se quedaba
  pegado al anterior. Los tres, en el `CHANGELOG` con su porqué.
- **Sigue abierto**: «Gastos se queda a medio pintar». **No se ha reproducido** — está medido en el
  `CHANGELOG` y en `docs/ROADMAP.md` («Abierto, con lo medido»). No lo toques a ciegas.
- **Sigue pendiente**: MyInvestor nativo, y validar la entrada de las diez Edge Functions (el único
  rojo de `docs/AMENAZAS.md`).

**Abierto ahora mismo (2026-08-06), rama `claude/gasto-no-registrado-az0b8z`:** dos gastos reales que
no entraron —uno suyo y otro de su padre— destaparon que un gasto se puede perder **sin dejar rastro
ninguno**: ni fila, ni aviso, ni error en el panel. Arreglado el clasificador (el nombre del comercio
se comía el gasto: «BAR STOP» picaba en `stop`), la basura de codificación del datáfono (un NUL tumba
el INSERT entero) y la cola de reintentos del lector de notis. **Falta compilar la APK, mirar el panel
de errores y publicar** → [`docs/briefs/brief-gastos-que-no-entran.md`](docs/briefs/brief-gastos-que-no-entran.md).
Y pidió que el lector deje de leer solo Trade Republic y lea **Google Wallet** (o sea, cualquier
tarjeta) apuntando en su divisa → [`docs/briefs/plan-notis-wallet-multidivisa.md`](docs/briefs/plan-notis-wallet-multidivisa.md).

⚠ `docs/memoria/pendiente-manana-4-12-0.md` retrata una noche de julio y es un espejo generado
(`npm run memoria`, **no se edita a mano**): sus puntos ya están hechos.
**La foto de ahora es `docs/ROADMAP.md`.**

Detalle y checklist en `docs/ROADMAP.md` y `docs/TESTING.md`. **No promocionar sin su OK** en el panel.

La cola post-rechazo de una beta (qué falló en el móvil y en qué orden arreglarlo) vive en
`docs/memoria/mi-cartera-backlog.md` (§8 ter / §8 quater / siguientes). El header del ROADMAP
puede ir un paso por detrás del último veredicto: **mira el backlog** antes de asumir que está
«pendiente de su primera prueba».
