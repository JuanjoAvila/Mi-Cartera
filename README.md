# Puente OTA legacy (`/Mi-Cartera`)

GitHub Pages **no** redirige al renombrar el repo a Aely. Los móviles con la base
`https://juanjoavila.github.io/Mi-Cartera/` cocida (producción 4.18.25 y APKs
anteriores a 4.19.81) pedían `version.json` y recibían **404**.

Este repo solo existe para servir esa ruta otra vez. El `url` del manifiesto apunta
al bundle real en `/Aely/`. En cada promote de producción hay que actualizar
`version.json` aquí (mismo número + misma URL Aely).

La entrega estable actual del puente es 4.26.110, fuente de Aely 8e6d1234ec27be2003f1fa8d3c753ae43e2cce2e, publicada el 9/10/2026. Se copian ZIP y manifiesto de APK reales ya verificados, sin generar otra APK. La release beta espejo conserva el canal beta propio y se actualiza con sus tres assets después de cada entrega.
