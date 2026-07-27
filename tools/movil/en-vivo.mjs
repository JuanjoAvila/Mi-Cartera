// GRABA SU DEDO, con la vara de SU PANTALLA. Uso: node en-vivo.mjs [segundos]
//
// ⚠ LA LECCIÓN DE 2026-07-27: su móvil va a 120 Hz (frame = 8,33 ms). Todas las medidas
// anteriores contaban «frame malo» por encima de 32 ms, que es el umbral de una pantalla de
// 60 Hz. Con esa vara sus tirones son INVISIBLES: un frame de 16,6 ms ya es un salto que en
// 120 Hz se ve perfectamente, porque el resto va a 8,4. De ahí cuatro instrumentos en verde
// mientras él veía el fallo. El umbral se calcula ahora del refresco REAL medido.
const SEGS = Number(process.argv[2] || 45);

const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const p = l.find((x) => x.type === "page");
if (!p) throw new Error("sin página CDP — ¿app abierta?");
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0;
const q = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (m, p2 = {}) => new Promise((res) => {
  const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: m, params: p2 }));
});
const ev = async (x) => {
  const r = await send("Runtime.evaluate", { expression: x, returnByValue: true });
  if (r.result?.exceptionDetails) return { err: r.result.exceptionDetails.exception?.description };
  return r.result?.result?.value;
};

const ver = await ev(`(document.documentElement.innerHTML.match(/APP_VERSION:\\s*"([^"]+)"/)||[])[1]`);

await ev(`(function(){
  if (window.__liveOff) window.__liveOff();
  var S = window.__live = {gestos:[], frames:[], largas:[], actual:null, nominal:8.33};

  var last = 0, rafOn = true, cal = [];
  (function tick(t){
    if (last) {
      var d = t - last;
      S.frames.push([t, Math.round(d*10)/10]);
      if (cal.length < 400) cal.push(d);
      if (S.frames.length > 9000) S.frames.shift();
    }
    last = t;
    if (rafOn) requestAnimationFrame(tick);
  })(performance.now());

  // Refresco real: la MODA de los deltas en reposo, no la media (la media la ensucian los saltos).
  window.__calibrar = function(){
    if (cal.length < 30) return S.nominal;
    var s = cal.slice().sort(function(a,b){ return a-b; });
    S.nominal = Math.round(s[Math.floor(s.length*0.25)] * 100) / 100;
    return S.nominal;
  };

  try {
    new PerformanceObserver(function(list){
      list.getEntries().forEach(function(e){ S.largas.push([Math.round(e.startTime), Math.round(e.duration)]); });
    }).observe({entryTypes:["longtask"]});
  } catch(e){}

  function tabAhora(){
    var b = document.querySelector(".botnav-tab.active");
    return b ? b.textContent.trim() : "(Ajustes?)";
  }
  function onStart(e){
    S.actual = {
      t0: performance.now(),
      desde: tabAhora(),
      scrollGastos: (document.querySelectorAll(".page")[1]||{}).scrollTop|0,
      barra: (document.querySelector(".botnav")||{className:""}).className.indexOf("botnav-hidden")>=0 ? "escondida" : "visible",
      fin: null
    };
  }
  function cerrar(como){
    var g = S.actual; if (!g) return;
    g.t1 = performance.now(); g.fin = como; S.actual = null;
    setTimeout(function(){
      g.hasta = tabAhora();
      g.conto = g.hasta !== g.desde;
      // ventana del gesto + la cola de la animación del track (0,42 s) + margen
      var w = S.frames.filter(function(f){ return f[0] >= g.t0 && f[0] <= g.t1 + 700; });
      g.gaps = w.map(function(f){ return f[1]; });
      g.largas = S.largas.filter(function(x){ return x[0] >= g.t0-50 && x[0] <= g.t1+700; }).map(function(x){ return x[1]; });
      S.gestos.push(g);
    }, 800);
  }
  var fs=function(e){onStart(e)}, fe=function(){cerrar("end")}, fc=function(){cerrar("CANCEL")};
  document.addEventListener("touchstart", fs, true);
  document.addEventListener("touchend", fe, true);
  document.addEventListener("touchcancel", fc, true);
  window.__liveOff = function(){
    rafOn = false;
    document.removeEventListener("touchstart", fs, true);
    document.removeEventListener("touchend", fe, true);
    document.removeEventListener("touchcancel", fc, true);
  };
  return "ok";
})()`);

await new Promise((r) => setTimeout(r, 1200));
const nominal = await ev("window.__calibrar()");
const hz = Math.round(1000 / nominal);
console.log(`grabando ${SEGS}s · ${ver} · pantalla ${hz} Hz (frame = ${nominal} ms)`);
console.log(`umbral de salto: > ${(nominal * 1.5).toFixed(1)} ms  (NO 32 ms: eso es de 60 Hz)\n`);
console.log("┌──────────────────────────────────────────────────────┐");
console.log("│  TU REPRO, con tu dedo:                              │");
console.log("│   Gastos arriba → Deudas, moverte rápido → a Gastos  │");
console.log("│   Repítelo. Y alguna a Cartera para comparar.        │");
console.log("└──────────────────────────────────────────────────────┘\n");

for (let s = SEGS; s > 0; s -= 5) {
  await new Promise((r) => setTimeout(r, 5000));
  const n = await ev("window.__live.gestos.length");
  process.stdout.write(`  …${s - 5}s (${n} gestos)   \r`);
}

const S = await ev(`(function(){ if(window.__liveOff) window.__liveOff(); return {gestos:window.__live.gestos, nominal:window.__live.nominal}; })()`);
const N = S.nominal || nominal;
const UNO = N * 1.5;
const DOS = N * 2.5;

const perdidos = (gaps) => gaps.reduce((a, g) => a + (g > UNO ? Math.round(g / N) - 1 : 0), 0);

console.log("\n\n═══ CADA GESTO TUYO, con la vara de 120 Hz ═══");
const porDestino = {};
for (const g of S.gestos || []) {
  const pierde = perdidos(g.gaps || []);
  const peor = g.gaps && g.gaps.length ? Math.max(...g.gaps) : 0;
  const saltos = (g.gaps || []).filter((x) => x > UNO);
  const et = `${g.desde} → ${g.hasta}`;
  const marca = pierde >= 3 ? "  ◄◄ TIRÓN" : pierde ? "  ◄" : "";
  console.log(
    `  ${et.padEnd(24)} ${(g.conto ? "cambió" : g.fin === "CANCEL" ? "CANCEL" : "-").padEnd(7)}` +
    ` frames perdidos ${String(pierde).padStart(3)} · peor ${String(peor.toFixed(1)).padStart(6)} ms` +
    ` · saltos [${saltos.slice(0, 6).map((x) => x.toFixed(0)).join(",")}]` +
    ` · Gastos@${String(g.scrollGastos).padStart(4)} · barra ${g.barra}${marca}`
  );
  if (g.conto) {
    (porDestino[g.hasta] = porDestino[g.hasta] || []).push(pierde);
  }
}

console.log(`\n═══ RESUMEN (frame nominal ${N} ms · un salto = > ${UNO.toFixed(1)} ms) ═══`);
for (const d of Object.keys(porDestino)) {
  const v = porDestino[d];
  const tot = v.reduce((a, b) => a + b, 0);
  const media = (tot / v.length).toFixed(1);
  const peorG = Math.max(...v);
  console.log(`  → ${d.padEnd(9)} ${String(v.length).padStart(3)} gestos · ${String(tot).padStart(4)} frames perdidos · ${media} por gesto · el peor gesto perdió ${peorG}`);
}
console.log(`\n  (con el umbral viejo de 32 ms, todo esto sale como «0 malos»)`);
ws.close();
