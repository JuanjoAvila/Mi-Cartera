-- ============================================================
-- 0020: la divisa de verdad del apunte (`importe_orig` + `divisa`)
--
-- Petición suya del 2026-08-06, con el crucero saliendo al día siguiente: «en el crucero pagaré con
-- revolut en otra moneda y me gustaría que me lo leyera... y me lo apuntara bien como debe ser».
--
-- Desde la 4.14.0, al apuntar a mano ya se elige la moneda (₺ / € / $…) y la app convierte a euros
-- con el tipo del BCE. Pero `origAmount` / `origCur` vivían SOLO en el cliente: se escribían en el
-- objeto en memoria y no había columna donde guardarlos. O sea que apuntabas 1.520 ₺, se guardaban
-- 41,80 €, y en cuanto el gasto daba la vuelta por la nube ya no constaba en ninguna parte que
-- fueran liras. Un viaje entero quedaba en el histórico como euros pelados, sin forma de saber qué
-- se pagó en qué moneda ni a qué cambio.
--
-- `importe`      → sigue mandando, y sigue siendo EUROS. La app cuenta en euros: presupuesto,
--                  patrimonio y round-up no se tocan. Esto es rastro, no una segunda contabilidad.
-- `importe_orig` → lo que marcaba el precio, en positivo (1520.00).
-- `divisa`       → en qué estaba (TRY). NULL = fue en euros, que es el caso normal.
--
-- Additiva y sin default: las filas de siempre se quedan con NULL y todo lo que había sigue igual.
-- El cliente además sabe reintentar sin estas columnas si la migración va por detrás del bundle
-- (`_isMissingDivisaCol` en 00-core.js): en un viaje, perder «eran liras» es una lástima; perder
-- el gasto entero sería inaceptable.
-- ============================================================

alter table public.expenses
  add column if not exists importe_orig numeric,
  add column if not exists divisa       text;

-- Un apunte o va entero en su divisa o no va: media pareja (importe sin moneda, o moneda sin
-- importe) solo puede salir de un bug, y guardarla dejaría un número sin unidades en un histórico
-- de dinero. Que falle aquí y se vea, en vez de contarlo mal para siempre.
alter table public.expenses
  drop constraint if exists expenses_divisa_completa;
alter table public.expenses
  add constraint expenses_divisa_completa
  check ((importe_orig is null and divisa is null) or (importe_orig is not null and divisa is not null))
  not valid;
