<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (notis-wallet-y-el-canal.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: notis-wallet-y-el-canal
description: "Los gastos \"que no entran\" suelen ser notis de Google Wallet, no fallos del parser; y cómo leer la noti REAL del móvil en vez de adivinarla"
metadata: 
  node_type: memory
  type: project
  originSessionId: 272a31c7-fc62-419e-a958-cac67b02f7a5
  modified: 2026-08-06T15:34:23.404Z
---

**2026-08-06.** Un gasto que «no entra» NO significa que el parser falle. Antes de tocar
`ingest_logic.ts`, comprobar de qué APP salió la notificación.

El caso: 76,08 € en Splau «desaparecido». Dos sesiones anteriores lo atribuyeron a la codificación
del datáfono y a un POST perdido. Las dos se equivocaron. La noti seguía **viva en la bandeja del
móvil** y era de `com.google.android.apps.walletnfcrel` — el lector solo escuchaba
`de.traderepublic.app`, así que nunca la vio. Ni `limpiarTexto()` ni la cola de reintentos la
habrían salvado.

**Leer la noti de verdad, no imaginarla** (con el móvil enchufado):
```
adb exec-out "dumpsys notification --noredact" > noti.txt
```
Buscar `android.title=String (…)` / `android.text=String (…)`, y `when=` para casarla con la hora.
Sacar los **codepoints** con Node antes de escribir ninguna regex: en Splau el título era
`CORNELLA` + `U+00C2` + `U+009F`, o sea UTF-8 (`C2 9F`) leído como Latin-1 — un carácter partido en
dos, no dos caracteres. Dato que cambió el diagnóstico: **`U+009F` no es un NUL, Postgres lo acepta**,
así que la fila no se perdió por la codificación.

**El canal manda más que el paquete.** Las notis de pago de Wallet van por `tapandpay.transactions.low`.
Filtrar por canal deja fuera pases de embarque, fidelización y «tarjeta añadida» sin adivinar
vocabulario. Es lo que permite tener `com.google.android.gms` en la lista sin tragar basura.

**La trampa del título:** en Wallet el título **ES el comercio** (al revés que TR). Escanear ahí el
ruido resucita el bug del bar del padre por la otra puerta («BAR STOP» pica en `stop`). Por eso
`clasificar()` recibe `fuente`. Ver [[tr-duplicados-saga]].

**Nunca hay dos «no puede ser»:** si el panel de errores no tiene nada, mirar si hay caminos que
salgan en silencio. `ingest` tiene dos `return … skipped` sin log — la ausencia de evento no prueba
que el POST se perdiera.
