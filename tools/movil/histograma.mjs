// ¿34 frames perdidos son TIRONES sueltos o es que la pantalla se va a 60 Hz durante el deslice?
// Si todos los huecos son de 16,6 ms → no hay tirón, hay MITAD DE TASA de refresco: la animación
// va a 60 en un móvil que el resto del tiempo va a 120, y eso se nota como «perder la fluidez».
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
await ev(`(function(){var b=[].slice.call(document.querySelectorAll(".botnav-tab")).find(function(x){return (x.textContent||"").indexOf("Plan")>=0;}); if(b) b.click();})()`);
await sleep(800);

eventos = [];
await send("Tracing.start", { categories: "-*,cc,benchmark,blink.user_timing", transferMode: "ReportEvents" });
await sleep(700);                                   // un trozo en REPOSO como referencia
await ev(`performance.mark("D0")`);
adb("shell", "input", "swipe", X(0.25), Y(0.5), X(0.95), Y(0.5), "180");
await sleep(800);
await ev(`performance.mark("D1")`);
await sleep(700);                                   // y otro trozo en reposo después
const fin = new Promise((r) => q.set("fin", r));
await send("Tracing.end");
await fin;

const m0 = eventos.find((e) => e.name === "D0").ts / 1000;
const m1 = eventos.find((e) => e.name === "D1").ts / 1000;
const pres = eventos
  .filter((e) => e.name === "PipelineReporter" && e.ph === "b" && /PRESENTED/.test(e.args?.frame_reporter?.state || ""))
  .map((e) => e.ts / 1000).sort((a, b) => a - b);

function histo(t0, t1, titulo) {
  // Hay DOS reporters por frame presentado (dos surfaces): vienen pegados con hueco 0. Sin
  // deduplicar, la mitad del histograma son ceros y el otro cubo sale con el doble de peso.
  const bruto = pres.filter((t) => t >= t0 && t <= t1);
  const w = bruto.filter((t, i) => i === 0 || t - bruto[i - 1] > 1);
  const gaps = [];
  for (let i = 1; i < w.length; i++) gaps.push(w[i] - w[i - 1]);
  if (titulo.indexOf("DURANTE") >= 0) {
    console.log(`\n  secuencia de huecos durante el gesto (ms):\n   ${gaps.map((g) => g.toFixed(0).padStart(3)).join(" ")}`);
  }
  if (!gaps.length) { console.log(`\n${titulo}: sin datos`); return; }
  const cubos = {};
  gaps.forEach((g) => { const k = (Math.round(g / 4.15) * 4.15).toFixed(1); cubos[k] = (cubos[k] || 0) + 1; });
  const dur = (t1 - t0) / 1000;
  console.log(`\n${titulo}   ${w.length} frames en ${dur.toFixed(2)} s → ${(w.length / dur).toFixed(0)} fps presentados`);
  for (const [k, v] of Object.entries(cubos).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const pct = 100 * v / gaps.length;
    console.log(`   hueco ${String(k).padStart(6)} ms  ${String(v).padStart(4)}  ${"█".repeat(Math.round(pct / 2))} ${pct.toFixed(0)} %`);
  }
}

histo(m0 - 650, m0 - 30, "REPOSO antes del deslice");
histo(m0, m1, "DURANTE el deslice");
histo(m1 + 30, m1 + 650, "REPOSO después");

console.log("\n  Refresco que reporta Android ahora mismo:");
const dump = adb("shell", "dumpsys", "display");
const m = dump.match(/mRefreshRate=([\d.]+)|refreshRate=([\d.]+)/g);
console.log("   ", m ? [...new Set(m)].slice(0, 6).join("  ") : "(no se pudo leer)");
ws.close();
