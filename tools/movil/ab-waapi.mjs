// Sustituye la transition CSS del track por element.animate (WAAPI) / rAF, sin tocar el repo.
// Métrica estable: saltos >12,5 ms en los 0,7 s tras soltar (la que da 14 clavados).
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

// Instala un onEnd alternativo: intercepta al quitar .dragging y asienta con el modo elegido.
await ev(`(function(){
  if (window.__waapiInstalled) return "ya";
  window.__settleModo = "css";   // css | waapi | raf | none | corta
  var trackObs = null;
  function asentarWAAPI(track, toX){
    var from = track.style.transform || "translate3d(0px,0,0)";
    var to = "translate3d(" + toX + "px,0,0)";
    track.style.transition = "none";
    var anim = track.animate(
      [{ transform: from }, { transform: to }],
      { duration: 420, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" }
    );
    anim.onfinish = function(){ track.style.transform = to; track.style.transition = ""; anim.cancel(); };
  }
  function asentarRAF(track, toX){
    var m = (track.style.transform||"").match(/translate3d\\((-?[\\d.]+)px/);
    var fromX = m ? parseFloat(m[1]) : 0;
    track.style.transition = "none";
    var t0 = performance.now();
    var dur = 420;
    function ease(t){ // approx cubic-bezier(.32,.72,0,1)
      var u = 1 - t;
      return 1 - (u*u*u*u); // ease-out strong
    }
    (function step(now){
      var p = Math.min(1, (now - t0) / dur);
      var x = fromX + (toX - fromX) * ease(p);
      track.style.transform = "translate3d(" + x + "px,0,0)";
      if (p < 1) requestAnimationFrame(step);
      else track.style.transition = "";
    })(t0);
  }
  // Monkeypatch: cuando la app quite .dragging del track, reescribimos el asentamiento.
  var proto = DOMTokenList.prototype;
  var origRemove = proto.remove;
  proto.remove = function(){
    var args = Array.prototype.slice.call(arguments);
    var soyTrack = this.ownerElement && this.ownerElement.classList && this.ownerElement.classList.contains("track") ||
                   (this.toString && false);
    // DOMTokenList no tiene ownerElement en todos lados; enganchamos por observación.
    return origRemove.apply(this, args);
  };
  // Más fiable: MutationObserver sobre la clase del track.
  function hook(){
    var track = document.querySelector(".track");
    if (!track || track.__hooked) return !!track;
    track.__hooked = true;
    var prev = track.className;
    var obs = new MutationObserver(function(){
      if (prev.indexOf("dragging") >= 0 && track.className.indexOf("dragging") < 0) {
        // Se acaba de soltar. Lee el transform que la app acaba de pedir (goTab lo escribe).
        var destino = track.style.transform;
        var mm = (destino||"").match(/translate3d\\((-?[\\d.]+)px/);
        var toX = mm ? parseFloat(mm[1]) : 0;
        if (window.__settleModo === "css") {
          // no tocar
        } else if (window.__settleModo === "none") {
          track.style.transition = "none";
          track.style.transform = destino;
          void track.offsetWidth;
          track.style.transition = "";
        } else if (window.__settleModo === "corta") {
          track.style.transition = "transform .18s cubic-bezier(.32,.72,0,1)";
          track.style.transform = destino;
          setTimeout(function(){ track.style.transition = ""; }, 220);
        } else if (window.__settleModo === "waapi") {
          // La app ya puso el transform final con transition CSS. Lo revertimos al punto
          // de soltar (aproximado: un frame antes no lo tenemos; usamos el computed).
          // Mejor: cancelar transition y animar desde computed actual.
          var cur = getComputedStyle(track).transform;
          track.style.transition = "none";
          track.style.transform = cur === "none" ? "translate3d(0px,0,0)" : cur;
          void track.offsetWidth;
          asentarWAAPI(track, toX);
        } else if (window.__settleModo === "raf") {
          var cur2 = getComputedStyle(track).transform;
          // matrix(1,0,0,1,tx,0) → tx
          var mx = (cur2||"").match(/matrix\\([^,]+,[^,]+,[^,]+,[^,]+,\\s*(-?[\\d.]+)/);
          var fromX = mx ? parseFloat(mx[1]) : toX;
          track.style.transition = "none";
          track.style.transform = "translate3d(" + fromX + "px,0,0)";
          void track.offsetWidth;
          asentarRAF(track, toX);
        }
      }
      prev = track.className;
    });
    obs.observe(track, { attributes: true, attributeFilter: ["class"] });
    return true;
  }
  hook();
  setInterval(hook, 1000);
  window.__waapiInstalled = true;
  return "ok";
})()`);

const irA = async (label) => {
  await ev(`(function(){var b=[].slice.call(document.querySelectorAll(".botnav-tab")).find(function(x){return (x.textContent||"").indexOf("${label}")>=0;}); if(b) b.click();})()`);
  await sleep(550);
};

async function unDeslice() {
  await irA("Plan");
  await sleep(280);
  eventos = [];
  await send("Tracing.start", { categories: "-*,cc,benchmark,blink.user_timing", transferMode: "ReportEvents" });
  await sleep(180);
  adb("shell", "input", "swipe", X(0.25), Y(0.5), X(0.95), Y(0.5), "180");
  await ev(`performance.mark("S")`);
  await sleep(700);
  await ev(`performance.mark("F")`);
  const fin = new Promise((r) => q.set("fin", r));
  await send("Tracing.end");
  await fin;
  const a = eventos.find((e) => e.name === "S"), b = eventos.find((e) => e.name === "F");
  if (!a || !b) return null;
  const bruto = eventos
    .filter((e) => e.name === "PipelineReporter" && e.ph === "b" && /PRESENTED/.test(e.args?.frame_reporter?.state || ""))
    .map((e) => e.ts / 1000).sort((x, y) => x - y).filter((t) => t >= a.ts / 1000 && t <= b.ts / 1000);
  const w = bruto.filter((t, i) => i === 0 || t - bruto[i - 1] > 1);
  let malos = 0;
  for (let i = 1; i < w.length; i++) if (w[i] - w[i - 1] > 12.5) malos++;
  const llego = await ev(`(function(){var x=document.querySelector(".botnav-tab.active");return x?x.textContent.trim():"?";})()`);
  return llego === "?" ? null : malos;
}

const MODOS = ["css", "corta", "waapi", "raf", "none"];
const VUELTAS = 4;
console.log("\n  No toques el móvil. Comparando formas de asentar el carrusel.\n");
const res = {};
MODOS.forEach((m) => (res[m] = []));
for (let v = 0; v < VUELTAS; v++) {
  const linea = [];
  for (const m of MODOS) {
    await ev(`window.__settleModo = ${JSON.stringify(m)}`);
    await sleep(300);
    process.stdout.write(`  vuelta ${v + 1}/${VUELTAS} · ${m.padEnd(8)}  \r`);
    const r = await unDeslice();
    if (r != null) { res[m].push(r); linea.push(`${m}=${r}`); }
  }
  console.log(`  vuelta ${v + 1}/${VUELTAS}   ${linea.join("  ")}                  `);
}
const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
console.log("\n═══ SALTOS EN EL ASENTAMIENTO ═══");
const mCss = media(res.css);
for (const m of MODOS) {
  const med = media(res[m]);
  const d = m === "css" ? "  ← actual" : (med < mCss * 0.5 ? `   ✓ MEJOR −${(100 * (mCss - med) / mCss).toFixed(0)} %` : "   igual");
  console.log(`  ${m.padEnd(10)} [${res[m].join(", ")}]  media ${med.toFixed(1)}${d}`);
}
ws.close();
