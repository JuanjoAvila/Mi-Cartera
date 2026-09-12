# Puente OTA legacy (`/Mi-Cartera`)

GitHub Pages **no** redirige al renombrar el repo a Aely. Los móviles con la base
`https://juanjoavila.github.io/Mi-Cartera/` cocida (producción 4.18.25 y APKs
anteriores a 4.19.81) pedían `version.json` y recibían **404**.

Este repo solo existe para servir esa ruta otra vez. El `url` del manifiesto apunta
al bundle real en `/Aely/`. En cada promote de producción hay que actualizar
`version.json` aquí (mismo número + misma URL Aely).
