# Decisiones de arquitectura (ADR)

Una página por decisión **que costó dinero o tiempo**, escrita **a posteriori**. No hay un ADR por
cambio: eso sería burocracia, y aquí no hay equipo al que informar.

Existen porque dentro de dos años nadie va a acordarse de por qué la app es un solo HTML sin build,
y quien llegue —otra IA, o él mismo— va a proponer «modernizarlo» sin saber qué se probó ya. Cada
página contesta lo mismo: **qué se decidió, qué se descartó, y qué haría falta para cambiar de
opinión.**

| # | Decisión | Cuándo |
|---|----------|--------|
| [0001](0001-supabase.md) | Supabase en vez de Firebase | 2026-05 |
| [0002](0002-monolito.md) | Un solo HTML, sin build ni JSX | 2026-04 (revisada 2026-07) |
| [0003](0003-cero-cdns.md) | Cero CDNs de terceros: todo auto-hospedado | 2026-06 |
| [0004](0004-ota-propio.md) | OTA propio en vez de Capgo de pago | 2026-07 |
| [0005](0005-capacitor.md) | Capacitor en vez de nativo o React Native | 2026-06 |
