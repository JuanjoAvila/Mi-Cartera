# Puente OTA legacy (`/Mi-Cartera`)

GitHub Pages **no** redirige al renombrar el repo a Aely. Los móviles con la base
`https://juanjoavila.github.io/Mi-Cartera/` cocida (producción 4.18.25 y APKs
anteriores a 4.19.81) pedían `version.json` y recibían **404**.

Este repo solo existe para servir esa ruta otra vez. El `url` del manifiesto apunta
al bundle real en `/Aely/`. En cada promote de producción hay que actualizar
`version.json` aquí (mismo número + misma URL Aely).

La entrega estable actual del puente es 4.26.106, fuente de Aely b1ad23f34f2a94933e57246dfdf12c451f5360a1, publicada el 8/10/2026. Se copian ZIP y manifiesto de APK reales ya verificados, sin generar otra APK. La release beta espejo conserva el canal beta propio y se actualiza con sus tres assets después de cada entrega.
