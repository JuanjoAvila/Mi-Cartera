/**
 * EL PRESUPUESTO DEL MES, TAL Y COMO LO CUENTA LA APP — espejo servidor de `monthBudgetStats()`
 * (`src/modules/08-motor-bank.js`).
 *
 * Bug real 2026-08-06: le saltó «¡95% del presupuesto! 965 € de 1.000 €» en la noti y en el widget,
 * y al abrir la app no llegaba al 30%. Las dos cifras salían de la MISMA nube, pero de dos cuentas
 * distintas: `ingest` sumaba **todas** las filas del mes sin filtrar nada, mientras que la app
 * descarta tres cosas. Con sus datos reales de agosto: servidor 964,58 € contra app 234,30 €.
 *
 * Lo que se colaba, medido:
 *   · Sabadell, 448,39 € — es su banco de recibos, no de gasto diario. La app enseña sus
 *     movimientos en la lista, pero NO los cuenta contra el presupuesto («que entre todo, pero que
 *     solo reste el de gasto diario», 2026-08-05).
 *   · Categoría Inversión, 281,89 € — las neutras (inversión/traspaso) son dinero suyo que cambia
 *     de sitio, no dinero gastado.
 *   · Y el presupuesto de referencia iba en bruto, sin restarle lo que él ya haya RESERVADO para
 *     sus metas ese mes.
 *
 * Un aviso que miente es peor que no avisar: enseña a ignorar los avisos. Por eso esto vive en un
 * módulo propio y con tests, y no suelto dentro del handler.
 *
 * ⚠ SI CAMBIA `monthBudgetStats()` EN EL CLIENTE, HAY QUE CAMBIAR ESTO. Son la misma regla escrita
 * dos veces porque corren en dos sitios (el widget se pinta con la app cerrada, sin JS del bundle).
 */

/** Igual que `CAT_NEUTRAS` en el cliente: ni suman gasto ni suman ingreso. */
const CAT_NEUTRAS: Record<string, number> = { inversion: 1, traspaso: 1 };

export type FilaGasto = { importe: number | string; cat?: string | null; source?: string | null };

/**
 * El banco (`ent`) de un gasto a partir de su `source`. Espejo de `expenseBankOf()`.
 * `source` lleva el banco embebido (`ob:caixa`, `manual:caixabank`…) porque no hay columna propia.
 * `null` = apuntado a mano sin banco → cuenta siempre, igual que en el cliente.
 */
export function bancoDeSource(source?: string | null): string | null {
  const s = String(source || "");
  if (s === "macrodroid" || s === "tr") return "trade_republic";
  if (s.indexOf("ob:") === 0) return s.slice(3) || null;
  if (s.indexOf("ob-hist:") === 0) return s.slice(8) || null;
  if (s.indexOf("manual:") === 0) return s.slice(7) || null;
  return null;
}

/** Rol de una cuenta. Espejo de `accRole()`: sin `role` explícito manda `spendFrom`. */
// deno-lint-ignore no-explicit-any
function rolDeCuenta(a: any): string {
  return (a && a.role) || (a && a.spendFrom ? "diario" : "fijos");
}

/**
 * Bancos cuyas compras cuentan para el presupuesto. Espejo de `expenseBankEnts()`: los marcados a
 * mano en `settings.expenseBanks` MÁS la cuenta de gasto diario, que entra siempre aunque la lista
 * ya tenga otros (si no, cambiar de banco diario dejaba el nuevo fuera para siempre).
 */
// deno-lint-ignore no-explicit-any
export function bancosDeGastoDiario(data: any): string[] {
  const out: string[] = [];
  const raw = data?.settings?.expenseBanks;
  if (Array.isArray(raw)) raw.forEach((e: string) => { if (e && out.indexOf(e) < 0) out.push(e); });
  // deno-lint-ignore no-explicit-any
  const diaria = (data?.accounts || []).find((a: any) => {
    const r = rolDeCuenta(a);
    return r === "diario" || r === "ambos";
  });
  if (diaria?.ent && out.indexOf(diaria.ent) < 0) out.push(diaria.ent);
  return out;
}

/** ¿Este movimiento mueve la cifra del presupuesto? Espejo de `expenseCountsBudget()`. */
export function cuentaParaPresupuesto(fila: FilaGasto, ents: string[]): boolean {
  if (!fila) return false;
  if (CAT_NEUTRAS[String(fila.cat || "")]) return false;
  const ent = bancoDeSource(fila.source);
  if (!ent) return true;                                   // a mano, sin banco → cuenta
  return ents.indexOf(ent) >= 0;
}

/** Lo apartado para metas desde `desdeMs`. Espejo de `reservedSince()`: se resta del presupuesto. */
// deno-lint-ignore no-explicit-any
export function reservadoDesde(data: any, desdeMs: number): number {
  // deno-lint-ignore no-explicit-any
  return (data?.reservaLog || []).reduce((a: number, x: any) => {
    const ms = new Date(x?.date).getTime();
    return isFinite(ms) && ms >= desdeMs ? a + (Number(x?.amount) || 0) : a;
  }, 0);
}

export type StatsMes = {
  spent: number;      // gasto bruto que cuenta
  income: number;     // ingresos que cuentan (en positivo)
  against: number;    // la cifra que se compara con el presupuesto (según gTotalMode)
  shown: number;      // la que PINTA la cabecera de Gastos → la misma que debe ir al widget
  budget: number;     // el presupuesto YA con lo reservado descontado
  reserved: number;
};

/**
 * La cuenta entera. `filas` son las del mes que ya vienen filtradas por fecha desde la consulta.
 *
 * `gTotalMode` decide qué se compara contra el presupuesto, igual que en el cliente:
 *   · "net"   → gasto MENOS ingresos (es como lo tiene él: por eso ve 234 € y no 413 €)
 *   · resto   → gasto bruto
 */
// deno-lint-ignore no-explicit-any
export function statsDelMes(filas: FilaGasto[], data: any, desdeMs: number): StatsMes {
  const ents = bancosDeGastoDiario(data);
  let spent = 0, income = 0;
  for (const f of filas || []) {
    if (!cuentaParaPresupuesto(f, ents)) continue;
    const n = Number(f.importe) || 0;
    if (n > 0) spent += n; else if (n < 0) income += Math.abs(n);
  }
  const reserved = reservadoDesde(data, desdeMs);
  const bruto = Number(data?.budget) || 0;
  const budget = bruto > 0 ? Math.max(0, +(bruto - reserved).toFixed(2)) : 0;
  const modo = data?.settings?.gTotalMode || "split";
  const against = modo === "net" ? spent - income : spent;
  // `shown` es lo que el widget debe enseñar: la MISMA cifra que la cabecera de Gastos. Solo se
  // separa de `against` cuando en modo neto los ingresos superan al gasto (ahí la app pinta el
  // saldo en positivo y el presupuesto se compara con un número negativo).
  const shown = modo === "net" ? Math.abs(income - spent) : spent;
  return {
    spent: +spent.toFixed(2),
    income: +income.toFixed(2),
    against: +against.toFixed(2),
    shown: +shown.toFixed(2),
    budget,
    reserved: +reserved.toFixed(2),
  };
}
