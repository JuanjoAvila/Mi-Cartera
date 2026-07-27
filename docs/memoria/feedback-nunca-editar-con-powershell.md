<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-nunca-editar-con-powershell.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-nunca-editar-con-powershell
description: "Nunca reescribir ficheros del repo con round-trips de PowerShell: corrompe UTF-8 y mete BOM. Usar Edit/Write."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5822cd4f-2e42-4254-8aa5-7c232af2642f
  modified: 2026-07-25T12:07:44.557Z
---

**NUNCA edites un fichero de este repo con `(Get-Content ... -Raw) | Set-Content`, `Set-Content -Encoding utf8` ni `[System.IO.File]` desde PowerShell.** Usa siempre las herramientas Edit/Write.

**Why:** el 2026-07-25 costó dos versiones de más y un APK inservible publicado al padre y a la pareja del usuario, que además lo detectó él y no yo:
- `Get-Content -Raw` en PowerShell 5.1 lee un fichero UTF-8 **sin BOM como Windows-1252**. Al reescribirlo como UTF-8, cada acento y cada símbolo se dobla: 95 líneas de `06-sync-brokers.js` y la descripción de `package.json` quedaron con mojibake (`✓` → `âœ"`), y llegó al móvil del usuario.
- `Set-Content -Encoding utf8` **mete BOM siempre** → un BOM al principio de `package.json` revienta `JSON.parse` con «Unexpected token '﻿'».
- Es **invisible en un diff** si no lo buscas y el resto de tests pasan tan contentos.

**How to apply:** para cambios de texto, Edit/Write. PowerShell solo para ejecutar comandos (git, gradle, gh, node), nunca para transformar contenido. Si un cambio parece repetitivo, sigue siendo más barato hacerlo con Edit que reparar la corrupción. Guardián en el repo: `tests/docs-frescura.test.mjs` caza el mojibake en `src/modules` y la doc.

Ver también [[mi-cartera-deploy]] (la otra pata del incidente: empaquetar el APK a mano en vez de con `npm run apk:prep` dejó `APP_VERSION:"dev"`, y `parseInt("dev")`→NaN hace que ese móvil **no se actualice nunca**, en silencio).
