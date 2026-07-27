// LA MÉTRICA DEFINITIVA: huecos entre frames PRESENTADOS de verdad.
//
// Historia de las varas equivocadas (2026-07-27), para que nadie repita el camino:
//   1. tareas largas          → 0 siempre. Su tirón no es JS bloqueando.
//   2. deltas de rAF > 32 ms  → 0 siempre. Umbral de 60 Hz en una pantalla de 120 Hz.
//   3. deltas de rAF > 12,5   → algo de señal, pero rAF es HILO PRINCIPAL y el desliz va en el
//                               COMPOSITOR: puede ir clavado a 8,3 ms mientras la pantalla salta.
//   4. % de frames DROPPED    → 33 % siempre, hasta en reposo. Es normal: el compositor pide 183/s
//                               y la pantalla presenta 122. El exceso se tira. No mide nada.
//   5. ESTO: tiempo entre presentaciones consecutivas. Es literalmente lo que ve el ojo.
import { writeFileSync } from "node:fs";

const SEGS = Number(process.argv[2] || 22);

const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const p = l.find((x) => x.type === "page");
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0;
const q = new Map();
let eventos = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); return; }
  if (m.method === "Tracing.dataCollected") eventos = eventos.concat(m.params.value);
  if (m.method === "Tracing.tracingComplete") { const f = q.get("fin"); if (f) f(); }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (m, p2 = {}) => new Promise((res) => {
  const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: m, params: p2 }));
});
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true })).result?.result?.value;

await ev(`(function(){
  if (window.__mkOff) window.__mkOff();
  function tab(){ var b=document.querySelector(".botnav-tab.active"); return b?b.textContent.trim():"?"; }
  var desde="";
  var fs=function(){ desde=tab(); performance.mark("GI|"+desde); };
  var fe=function(){ var d=desde; setTimeout(function(){ performance.mark("GF|"+d+">"+tab()); },500); };
  document.addEventListener("touchstart",fs,true);
  document.addEventListener("touchend",fe,true);
  window.__mkOff=function(){ document.removeEventListener("touchstart",fs,true); document.removeEventListener("touchend",fe,true); };
  return "ok";
})()`);

await send("Tracing.start", { categories: "-*,cc,benchmark,blink.user_timing", transferMode: "ReportEvents" });
console.log(`\n  ▶ ${SEGS}s — TU REPRO: Deudas, moverte, deslizar a Gastos. Alterna con Cartera.\n`);
for (let s = SEGS; s > 0; s--) { process.stdout.write(`     ${s}s  \r`); await new Promise((r) => setTimeout(r, 1000)); }
const fin = new Promise((r) => q.set("fin", r));
await send("Tracing.end");
await fin;
await ev("window.__mkOff && window.__mkOff()");

// Un frame "llega a la pantalla" si su reporter acaba presentado. ts en microsegundos.
const pres = eventos
  .filter((e) => e.name === "PipelineReporter" && e.ph === "b" && /PRESENTED/.test(e.args?.frame_reporter?.state || ""))
  .map((e) => e.ts / 1000)
  .sort((a, b) => a - b);
const marcas = eventos
  .filter((e) => typeof e.name === "string" && /^G[IF]\|/.test(e.name))
  .map((e) => ({ t: e.ts / 1000, m: e.name }))
  .sort((a, b) => a.t - b.t);
console.log(`\n  ${pres.length} frames presentados · ${marcas.length} marcas`);

const NOM = 1000 / 120;
function analiza(t0, t1) {
  const w = pres.filter((t) => t >= t0 && t <= t1);
  const gaps = [];
  for (let i = 1; i < w.length; i++) gaps.push(w[i] - w[i - 1]);
  const perdidos = gaps.reduce((a, g) => a + (g > NOM * 1.5 ? Math.round(g / NOM) - 1 : 0), 0);
  const peor = gaps.length ? Math.max(...gaps) : 0;
  const dur = t1 - t0;
  return { fps: dur > 0 ? (w.length / dur) * 1000 : 0, perdidos, peor, saltos: gaps.filter((g) => g > NOM * 1.5) };
}

const agg = {};
const filas = [];
for (let i = 0; i < marcas.length; i++) {
  if (!marcas[i].m.startsWith("GI|")) continue;
  const f2 = marcas.slice(i + 1).find((x) => x.m.startsWith("GF|"));
  if (!f2) continue;
  const r = analiza(marcas[i].t, f2.t);
  const et = f2.m.slice(3);
  filas.push({ et, ...r });
  const a = (agg[et] = agg[et] || { n: 0, perdidos: 0, fps: 0, peor: 0 });
  a.n++; a.perdidos += r.perdidos; a.fps += r.fps; a.peor = Math.max(a.peor, r.peor);
}

console.log(`\n═══ CADA GESTO · fps REAL en pantalla (tu móvil da 120) ═══`);
for (const f of filas) {
  const marca = f.perdidos >= 4 ? "  ◄◄ TIRÓN" : f.perdidos >= 2 ? "  ◄" : "";
  console.log(`  ${f.et.padEnd(20)} ${f.fps.toFixed(0).padStart(4)} fps · ${String(f.perdidos).padStart(3)} frames perdidos · hueco peor ${f.peor.toFixed(1).padStart(6)} ms · saltos [${f.saltos.slice(0, 5).map((x) => x.toFixed(0)).join(",")}]${marca}`);
}
console.log(`\n═══ RESUMEN POR TRAYECTO ═══`);
for (const [k, v] of Object.entries(agg).sort((a, b) => (b[1].perdidos / b[1].n) - (a[1].perdidos / a[1].n))) {
  console.log(`  ${k.padEnd(20)} ${String(v.n).padStart(3)} gestos · ${(v.fps / v.n).toFixed(0).padStart(4)} fps medios · ${(v.perdidos / v.n).toFixed(1)} frames perdidos por gesto · peor hueco ${v.peor.toFixed(0)} ms`);
}
writeFileSync("tools/movil/ultima-huecos.json", JSON.stringify({ filas, agg }, null, 1));
ws.close();
