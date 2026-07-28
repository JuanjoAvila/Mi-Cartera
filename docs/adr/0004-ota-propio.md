# 0004 — OTA propio en vez de Capgo de pago

**Estado:** vigente, y ha costado caro · **Fecha:** 2026-07

## Lo que se decidió
Las actualizaciones web del APK se descargan de **GitHub Pages** (canal estable) o de los assets de
una **Release fija `beta`** (canal de pruebas), y las aplica `CapacitorUpdater` en modo manual. Sin
el servicio de pago de Capgo.

## Por qué
Cuesta cero y el mecanismo es el mismo que ya se usa para todo lo demás. Con tres usuarios, pagar
una suscripción por repartir un ZIP no se sostiene.

## Qué se ha pagado por ello — y esto es lo importante de este ADR
El canal beta **estuvo roto en silencio dos semanas** y hicieron falta dos versiones seguidas para
arreglarlo, porque el fallo tenía **dos causas distintas con el mismo síntoma**:

1. **4.10.1** — los assets de las Releases redirigen a un dominio que no estaba en la CSP.
2. **4.10.2** — y aun con la CSP arreglada, **esos assets no mandan cabeceras CORS en ninguno de
   los dos saltos**, así que la WebView tiraba la respuesta igual. La petición la hace ahora
   Android (`CapacitorHttp`), que no sabe de CORS.

Y encima el fallo era **mudo**: `mcFetchManifest` caía a estable ante cualquier error y contestaba
«✓ estás a la última» con la beta publicada delante. Hoy solo cae con un **404**; cualquier otro
fallo sale en el toast y en `app_events`.

**La lección, que vale más que la decisión:** un canal de actualización que falla en silencio es
peor que no tenerlo. Guardián: `tests/updates.test.mjs`.

## Qué haría cambiar de opinión
Que hubiera usuarios de verdad. Con gente que no puedes llamar por teléfono cuando algo va mal,
pagar por un canal que alguien más mantiene deja de ser un lujo.
