// BANCO DE PRUEBAS del tirón, sin su dedo. Ciclo: scroll dentro de la pestaña + deslice.
//
// El patrón que se ve en todas las medidas: deslizar muchas veces seguidas NO falla (0-1 frames);
// falla el PRIMER deslice DESPUÉS de haber hecho scroll dentro de la pestaña. Que es justo su
// repro de siempre («Gastos arriba del todo, entras en Deudas, TE MUEVES, y vuelves»).
// Métrica: huecos entre frames presentados (ver huecos.mjs y su lista de varas equivocadas).
import { execFileSync } from "node:child_process";
const ADB = process.env.LOCALAPPDATA + "/Android/Sdk/platform-tools/adb.exe";
const adb = (...a) => { try { return execFileSync(ADB, a, { stdio: "pipe" }).toString(); } catch (e) { return ""; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const meta = await ev(`({dpr:devicePixelRatio,w:innerWidth,h:innerHeight})`);
const X = (f) => String(Math.round(meta.w * f * meta.dpr));
const Y = (f) => String(Math.round(meta.h * f * meta.dpr));
const tab = () => ev(`(function(){var b=document.querySelector(".botnav-tab.active");return b?b.textContent.trim():"?";})()`);
const irA = async (label) => {
  await ev(`(function(){var b=[].slice.call(document.querySelectorAll(".botnav-tab")).find(function(x){return (x.textContent||"").indexOf("${label}")>=0;}); if(b) b.click();})()`);
  await sleep(700);
};

const NOM = 1000 / 120;
function analiza(t0, t1) {
  const pres = eventos
    .filter((e) => e.name === "PipelineReporter" && e.ph === "b" && /PRESENTED/.test(e.args?.frame_reporter?.state || ""))
    .map((e) => e.ts / 1000).sort((a, b) => a - b)
    .filter((t) => t >= t0 && t <= t1);
  let perdidos = 0, peor = 0;
  for (let i = 1; i < pres.length; i++) {
    const g = pres[i] - pres[i - 1];
    if (g > NOM * 1.5) perdidos += Math.round(g / NOM) - 1;
    if (g > peor) peor = g;
  }
  return { perdidos, peor: Math.round(peor * 10) / 10, n: pres.length };
}

// El reloj de la traza y el de la página son el mismo (ambos monotónicos del sistema) salvo
// desfase: se calibra con una marca de user_timing dentro de la propia traza.
async function cicloMedido(conScroll) {
  await irA("Plan");
  await sleep(400);
  eventos = [];
  await send("Tracing.start", { categories: "-*,cc,benchmark,blink.user_timing", transferMode: "ReportEvents" });
  await sleep(300);
  if (conScroll) {
    for (let i = 0; i < 6; i++) { adb("shell", "input", "swipe", X(0.5), Y(0.72), X(0.5), Y(0.3), "60"); await sleep(70); }
    await sleep(200);
  }
  await ev(`performance.mark("DESLIZ-INI")`);
  // Arrancar en 0.25 y no en el borde: los primeros 52 px son la franja que abre Ajustes
  // (EDGE_OPEN). Empezando antes se mide el cajón, no el carrusel — y la pestaña activa sale "?".
  adb("shell", "input", "swipe", X(0.25), Y(0.5), X(0.95), Y(0.5), "180");
  await sleep(900);
  await ev(`performance.mark("DESLIZ-FIN")`);
  const fin = new Promise((r) => q.set("fin", r));
  await send("Tracing.end");
  await fin;
  const m = eventos.filter((e) => /^DESLIZ-/.test(e.name || "")).sort((a, b) => a.ts - b.ts);
  const ini = m.find((x) => x.name === "DESLIZ-INI");
  const f2 = m.find((x) => x.name === "DESLIZ-FIN");
  if (!ini || !f2) return { perdidos: -1, peor: -1, n: 0, llego: await tab() };
  return { ...analiza(ini.ts / 1000, f2.ts / 1000), llego: await tab() };
}

console.log("\n  Probando si el banco sintético reproduce el tirón (no toques el móvil)…\n");
const sinScroll = [], conScroll = [];
for (let i = 0; i < 4; i++) {
  const a = await cicloMedido(false);
  const b = await cicloMedido(true);
  sinScroll.push(a); conScroll.push(b);
  console.log(`  vuelta ${i + 1}   deslice a secas: ${String(a.perdidos).padStart(3)} perdidos (peor ${String(a.peor).padStart(5)} ms, llegó a ${a.llego})` +
              `   ·   tras scroll: ${String(b.perdidos).padStart(3)} perdidos (peor ${String(b.peor).padStart(5)} ms, llegó a ${b.llego})`);
}
const med = (a) => (a.reduce((x, y) => x + Math.max(0, y.perdidos), 0) / a.length).toFixed(1);
const peor = (a) => Math.max(...a.map((y) => y.peor));
console.log(`\n═══ ¿SIRVE EL BANCO? ═══`);
console.log(`  deslice a secas   ${med(sinScroll)} frames perdidos de media · peor hueco ${peor(sinScroll)} ms`);
console.log(`  deslice tras scroll ${med(conScroll)} frames perdidos de media · peor hueco ${peor(conScroll)} ms`);
console.log(Number(med(conScroll)) >= 4
  ? "\n  ✓ REPRODUCE. Ya se puede iterar sin su dedo."
  : "\n  ✗ no reproduce: hace falta su dedo (o el escenario aún no es el suyo).");
ws.close();
