<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (promote-merge-theirs.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: promote-merge-theirs
description: "El promote beta→main mezcla con -X theirs: se traga en silencio lo que solo exista en main (CHANGELOG/RELEASE_NOTES). Revisar el diff, no fiarse del verde."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5440e242-096b-4790-941b-9d1e03a63518
  modified: 2026-08-05T01:27:14.029Z
---

`promote-beta.yml` hace `git merge --no-ff -X theirs origin/beta`. Ese `-X theirs` significa
**«en cualquier conflicto gana beta, sin avisar»**.

**Por qué se puso (2026-08-05):** el promote de la 4.13.0 chocó porque `main` llevaba cherry-picks
parciales de 4.12.3/4.12.4 (features sueltas subidas antes que la ronda entera). Al mezclar la ronda
completa salieron `USO_OK`, `gastosForceAll` y `hojaOpen` **declarados dos veces**. Un `const`
repetido en el mismo ámbito es un **SyntaxError**: el bundle promocionado no arrancaba — y los tests
de cada rama pasaban, porque el destrozo nace EN el merge, no en ninguna de las dos ramas.

**La trampa que deja abierta:** se traga en silencio todo lo que solo exista en `main`. Ya pasó ese
mismo día — se perdió la entrada 4.12.4 del `CHANGELOG.md` y hubo que rescatarla a mano (`1340e53`).
Los candidatos permanentes son **`CHANGELOG.md` y `RELEASE_NOTES`**, porque se escriben siempre
arriba del todo y conflictan en cada promote.

**Cómo trabajar con esto:**
- Tras promocionar, mirar el diff `main` vs `beta` y pasar `npm run test:syntax`. Actions en verde
  NO basta: un duplicado de merge no lo ve ningún test de rama.
- La cura de fondo es **no cherry-pickear de `beta` a `main`**: promocionar rondas enteras. Cada
  feature adelantada deja una mina para el promote siguiente.

Está escrito también en `AGENTS.md` §6 (lo lee Cursor solo) — petición suya del 5/8: «que si tiro de
Cursor que también lo sepa». Ver [[mi-cartera-deploy]] y [[feedback-canal-beta-siempre]].
