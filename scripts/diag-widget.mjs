#!/usr/bin/env node
/**
 * ¿POR QUÉ EL WIDGET DICE UN NÚMERO Y LA APP OTRO?
 *
 * Bug abierto desde el 2026-08-17: widget 907 €, app 709 € (Δ 198). Antes fue 891 vs 686 (Δ 205).
 * Cliente y servidor comparten fórmula —eso está probado en `presupuesto-servidor`—, así que la
 * diferencia solo puede venir de los DATOS DE ENTRADA. Este script lo comprueba con sus datos
 * REALES en vez de suponer: baja su `app_state` y sus `expenses` del mes y pasa LAS MISMAS filas
 * por las dos implementaciones.
 *
 *   · Si las dos dan lo mismo  → el cálculo está bien; lo que difiere es lo que cada lado VE
 *                                (el móvil tiene filas que la nube no, o al revés).
 *   · Si dan distinto          → hay divergencia de fórmula pese al test, y sale aquí.
 *
 * ⚠ LA SALIDA LLEVA DATOS SUYOS (nombres de comercio, importes, y en los bizums nombres de
 * personas). Es para mirarla y ya: no pegarla en el repo, ni en un issue, ni en un commit.
 *
 * Uso:  node scripts/diag-widget.mjs   (necesita SUPABASE_SERVICE_ROLE_KEY en .env.local)
 *
 * HALLAZGO DEL 2026-08-17, para no repetir el camino:
 *   · Las dos fórmulas dan EXACTAMENTE lo mismo con la misma entrada. No toques el cálculo.
 *   · El widget cuenta filas que la app ya descartó: 9 con lápida en `state.deleted` que siguen
 *     vivas en la tabla `expenses` (ingest consulta la tabla y no sabe nada de lápidas), más los
 *     gemelos que `reconcileObDupes` quita en local y en la nube no.
 *   · Y al revés: la app FUSIONA por `día|importe|comercio` mientras la nube guarda por `fecha`
 *     con hora, así que dos cargos de verdad del mismo importe el mismo día en el mismo sitio se
 *     ven como uno solo en el móvil (caso medido: 230 € a las 11:31 y otros 230 € a las 13:08).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { loadPureLogicFromFile } from "./load-pure-logic.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROJECT_REF = "sfyfjagbnhbplrljpbvh";
const BASE = `https://${PROJECT_REF}.supabase.co`;

function loadEnvLocal() {
  const f = path.join(root, ".env.local");
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
const KEY = { ...loadEnvLocal(), ...process.env }.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1); }

const api = async (p) => {
  const r = await fetch(`${BASE}/rest/v1/${p}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) { console.error(`HTTP ${r.status} en ${p}: ${await r.text()}`); process.exit(1); }
  return r.json();
};

// Las dos implementaciones, cargadas de verdad (no copiadas).
const ts = fs.readFileSync(path.join(root, "supabase/functions/_shared/presupuesto.ts"), "utf8");
const js = transformSync(ts, { loader: "ts", format: "esm" }).code;
const srv = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const cli = loadPureLogicFromFile();

const eur = (n) => (Math.round(n * 100) / 100).toFixed(2) + " €";

const estados = await api("app_state?select=user_id,data");
if (!estados.length) { console.error("No hay app_state"); process.exit(1); }

const ahora = new Date();
const desdeMs = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1);
const desde = new Date(desdeMs).toISOString();

for (const { user_id, data } of estados) {
  const filas = await api(
    `expenses?select=fecha,importe,cat,source,comercio&user_id=eq.${user_id}&fecha=gte.${desde}`,
  );
  console.log(`\n═══ usuario ${String(user_id).slice(0, 8)}… · ${filas.length} filas este mes ═══`);
  console.log(`presupuesto ${data?.budget ?? "—"} · modo ${data?.settings?.gTotalMode || "split"}` +
    ` · bancos de gasto: ${(srv.bancosDeGastoDiario(data) || []).join(", ") || "—"}`);

  // 1) EL SERVIDOR, con lo que hay en la nube. Es literalmente lo que manda al widget.
  const s = srv.statsDelMes(filas, data, desdeMs);
  console.log(`\n  SERVIDOR (lo que va al widget)`);
  console.log(`    gastado(shown) ${eur(s.shown)} · bruto ${eur(s.spent)} · ingresos ${eur(s.income)}`);
  console.log(`    presupuesto ${eur(s.budget)} · reservado ${eur(s.reserved)} · te quedan ${eur(Math.max(0, s.budget - s.against))}`);

  // 2) EL CLIENTE, con LAS MISMAS filas traducidas a su formato. Si sale otro número con la misma
  //    entrada, la culpa es de la fórmula; si sale el mismo, la culpa es de qué filas ve cada uno.
  const comoCliente = filas.map((f) => ({
    date: f.fecha, amount: Number(f.importe) || 0, category: f.cat, source: f.source,
  }));
  const c = cli.monthBudgetStats(Object.assign({}, data, { expenses: comoCliente }));
  console.log(`\n  CLIENTE, con LAS MISMAS filas`);
  console.log(`    gastado(shown) ${eur(c.shown)} · bruto ${eur(c.spent)} · ingresos ${eur(c.income)}`);

  const iguales = Math.abs(c.shown - s.shown) < 0.02;
  console.log(`\n  ⇒ ${iguales
    ? "MISMA CIFRA con la misma entrada → la formula esta bien; lo que difiere es lo que ve cada lado"
    : "DISTINTA con la misma entrada → hay divergencia de FORMULA (" + eur(Math.abs(c.shown - s.shown)) + ")"}`);

  // 3) Desglose de lo que el servidor SÍ cuenta, para poder cotejarlo contra la pantalla del móvil.
  const ents = srv.bancosDeGastoDiario(data);
  const cuentan = filas.filter((f) => srv.cuentaParaPresupuesto(f, ents));
  console.log(`\n  cuentan ${cuentan.length} de ${filas.length} filas`);
  const porFuente = {};
  for (const f of cuentan) {
    const k = String(f.source || "?").split(":")[0];
    porFuente[k] = (porFuente[k] || 0) + (Number(f.importe) || 0);
  }
  for (const [k, v] of Object.entries(porFuente).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(12)} ${eur(v)}`);
  }
  console.log(`  las 8 mas gordas que cuentan:`);
  cuentan.slice().sort((a, b) => Math.abs(b.importe) - Math.abs(a.importe)).slice(0, 8)
    .forEach((f) => console.log(`    ${String(f.fecha).slice(5, 10)}  ${eur(Number(f.importe)).padStart(11)}` +
      `  ${String(f.cat || "").padEnd(11)} ${String(f.source || "").padEnd(16)} ${String(f.comercio || "").slice(0, 18)}`));

  // 4) Gemelos: mismo importe y mismo dia por DOS caminos. Es la sospecha numero uno de que la
  //    nube tenga filas que el movil ya descarto (reconcileObDupes borra en local y puede fallar
  //    en la nube sin decir nada: `.catch(()=>{})`).
  const porClave = {};
  for (const f of cuentan) {
    const k = String(f.fecha).slice(0, 10) + "|" + (Number(f.importe) || 0).toFixed(2);
    (porClave[k] = porClave[k] || []).push(f);
  }
  const gemelos = Object.entries(porClave).filter(([, v]) => v.length > 1);
  if (gemelos.length) {
    const sobra = gemelos.reduce((a, [, v]) => a + (v.length - 1) * Math.abs(Number(v[0].importe) || 0), 0);
    console.log(`\n  ⚠ ${gemelos.length} grupo(s) de gemelos (mismo dia + mismo importe) que SI cuentan.`);
    console.log(`    si cada grupo deberia ser UNA sola fila, sobran ${eur(sobra)}`);
    gemelos.slice(0, 6).forEach(([k, v]) => console.log(
      `    ${k}  x${v.length}  [${v.map((x) => String(x.source || "?")).join(" + ")}]  ${String(v[0].comercio || "").slice(0, 16)}`));
  } else {
    console.log(`\n  sin gemelos exactos entre lo que cuenta`);
  }

  /* 5) LA PRUEBA DE FUEGO: reproducir lo que ve la APP.
     `syncCloudExpenses` (11-app-main.js ~297) fusiona lo que baja de la nube con
     `keyOf = dia|importe|comercio` — DÍA, sin hora— y descarta lo que tenga lápida en
     `state.deleted`. La nube, en cambio, guarda una fila por `fecha` COMPLETA (con hora): su clave
     única es `user_id,fecha,importe,comercio`. O sea que dos cargos del mismo importe, el mismo
     día y en el mismo sitio son DOS filas en la nube y UNA sola en el móvil. El widget cuenta las
     dos; la app, una. Ahí es donde puede nacer el desfase. */
  const claveApp = (f) => String(f.fecha).slice(0, 10) + "|" + (Number(f.importe) || 0) + "|" + (f.comercio || "");
  const lapidas = new Set(data?.deleted || []);
  const vistas = new Set();
  const comoLaApp = [];
  let tapadasPorLapida = 0, tapadasPorClave = 0, importeTapado = 0;
  for (const f of filas) {
    const k = claveApp(f);
    if (lapidas.has(k)) { tapadasPorLapida++; importeTapado += Number(f.importe) || 0; continue; }
    if (vistas.has(k)) { tapadasPorClave++; importeTapado += Number(f.importe) || 0; continue; }
    vistas.add(k);
    comoLaApp.push(f);
  }
  const cApp = cli.monthBudgetStats(Object.assign({}, data, {
    expenses: comoLaApp.map((f) => ({ date: f.fecha, amount: Number(f.importe) || 0, category: f.cat, source: f.source })),
  }));
  console.log(`\n  LO QUE VE LA APP (nube + fusion por dia|importe|comercio + lapidas)`);
  console.log(`    ${tapadasPorClave} fila(s) tapadas por la fusion · ${tapadasPorLapida} por lapida` +
    ` · ${eur(importeTapado)} en total`);
  console.log(`    gastado(shown) ${eur(cApp.shown)}   ← esto deberia ser lo que enseña la pantalla`);
  console.log(`    frente a ${eur(s.shown)} del widget  ⇒ desfase ${eur(s.shown - cApp.shown)}`);

  // Y las horas de los gemelos: si son minutos, es la MISMA compra entrando dos veces; si son
  // horas, son dos compras de verdad y la que se esconde es la app.
  if (gemelos.length) {
    console.log(`\n  horas de cada gemelo (para saber si son la misma compra o dos):`);
    gemelos.slice(0, 6).forEach(([k, v]) => {
      const horas = v.map((x) => String(x.fecha).slice(11, 19)).join("  vs  ");
      console.log(`    ${k}  →  ${horas}`);
    });
  }
}
