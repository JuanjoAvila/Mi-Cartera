// TODO lo medido hasta hoy mira el DESLIZ, y sale verde. Esto mira lo de DESPUÉS:
// el segundo y medio siguiente a soltar el dedo en Gastos, y el scroll inmediato ahí.
// Frames de rAF (lo que ve el ojo) + animaciones CSS vivas al aterrizar.
import { execFileSync } from "node:child_process";
const ADB = process.env.LOCALAPPDATA + "/Android/Sdk/platform-tools/adb.exe";
const adb = (...a) => { try { execFileSync(ADB, a, { stdio: "pipe" }); } catch (e) {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const p = l.find((x) => x.type === "page");
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

const meta = await ev(`({dpr:devicePixelRatio, w:innerWidth, h:innerHeight, ver:(document.documentElement.innerHTML.match(/APP_VERSION:\\s*"([^"]+)"/)||[])[1]})`);
console.log("móvil:", meta);
const X = (f) => String(Math.round(meta.w * f * meta.dpr));
const Y = (f) => String(Math.round(meta.h * f * meta.dpr));

// Medidor de frames: deltas de rAF, que es lo único que ve el ojo (AGENTS §7 bis).
await ev(`(function(){
  window.__f = {on:false, last:0, gaps:[], anims:0, animList:[]};
  function tick(t){
    if (window.__f.on) {
      if (window.__f.last) window.__f.gaps.push(Math.round((t - window.__f.last) * 10) / 10);
      window.__f.last = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.__fStart = function(){ window.__f.on = true; window.__f.last = 0; window.__f.gaps = []; };
  window.__fStop = function(){
    window.__f.on = false;
    var g = window.__f.gaps;
    var malos = g.filter(function(x){ return x > 32; });
    return {frames:g.length, malos:malos.length, peor:g.length?Math.max.apply(null,g):0, lista:malos.slice(0,12)};
  };
  window.__anims = function(){
    try {
      return document.getAnimations().filter(function(a){ return a.playState === "running"; })
        .map(function(a){ return (a.animationName || (a.transitionProperty||"transition")) + "@" + ((a.effect&&a.effect.target&&a.effect.target.className)||"?").toString().slice(0,28); });
    } catch(e){ return ["(sin getAnimations)"]; }
  };
  return "ok";
})()`);

async function clickTab(label) {
  await ev(`(function(){
    var b=[].slice.call(document.querySelectorAll(".botnav-tab")).find(function(x){return (x.textContent||"").indexOf("${label}")>=0;});
    if(b) b.click();
  })()`);
  await sleep(900);
}
const activa = () => ev(`(document.querySelector(".botnav-tab.active")||{}).textContent`);

async function prepararDeudas() {
  await clickTab("Plan");
  await ev(`(function(){
    var b=[].slice.call(document.querySelectorAll(".v4-seg-btn")).find(function(x){return /Deuda/i.test(x.textContent);});
    if(b) b.click();
  })()`);
  await sleep(600);
  // moverse RÁPIDO por Deudas, que es lo que él siempre repite
  for (let i = 0; i < 6; i++) {
    adb("shell", "input", "swipe", X(0.5), Y(0.75), X(0.5), Y(0.35), "70");
    await sleep(90);
  }
  await sleep(250);
}

async function ronda(destino) {
  await prepararDeudas();
  const dir = destino === "Gastos"
    ? [X(0.1), Y(0.45), X(0.9), Y(0.45), "200"]
    : [X(0.9), Y(0.45), X(0.1), Y(0.45), "200"];

  // A) la ventana DEL DESLIZ (lo que ya se midió mil veces)
  await ev("window.__fStart()");
  adb("shell", "input", "swipe", ...dir);
  await sleep(700);
  const durante = await ev("window.__fStop()");
  const anims = await ev("window.__anims()");

  // B) el segundo siguiente a aterrizar — NADIE ha medido esto
  await ev("window.__fStart()");
  await sleep(1200);
  const despues = await ev("window.__fStop()");

  // C) SCROLL inmediato en la pestaña de destino — tampoco
  await ev("window.__fStart()");
  for (let i = 0; i < 5; i++) {
    adb("shell", "input", "swipe", X(0.5), Y(0.72), X(0.5), Y(0.32), "70");
    await sleep(110);
  }
  await sleep(500);
  const scroll = await ev("window.__fStop()");

  console.log(`\n=== destino ${destino} (llegó a: ${await activa()}) ===`);
  console.log("  durante el desliz :", durante);
  console.log("  animaciones vivas :", (anims || []).length, (anims || []).slice(0, 8));
  console.log("  1,2 s DESPUÉS     :", despues);
  console.log("  SCROLL al llegar  :", scroll);
  return { durante, despues, scroll, anims };
}

const g = await ronda("Gastos");
const c = await ronda("Cartera");

console.log("\n──────── resumen (frames >32 ms = tirón visible) ────────");
console.log(`  desliz   Gastos ${g.durante.malos} malos / peor ${g.durante.peor} ms  ·  Cartera ${c.durante.malos} / ${c.durante.peor} ms`);
console.log(`  después  Gastos ${g.despues.malos} malos / peor ${g.despues.peor} ms  ·  Cartera ${c.despues.malos} / ${c.despues.peor} ms`);
console.log(`  scroll   Gastos ${g.scroll.malos} malos / peor ${g.scroll.peor} ms  ·  Cartera ${c.scroll.malos} / ${c.scroll.peor} ms`);
console.log(`  anims    Gastos ${(g.anims||[]).length}  ·  Cartera ${(c.anims||[]).length}`);
ws.close();
