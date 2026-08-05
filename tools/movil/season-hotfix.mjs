// Inyecta el fix de season en caliente en el WebView (sin esperar OTA) y comprueba scroll.
import { writeFileSync } from "node:fs";
const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const p = l.find((x) => x.type === "page");
if (!p) throw new Error("sin página CDP — ¿adb forward?");
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
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;

console.log("inyectando…", await ev(`(function(){
  // Quitar html::before viejo dejando el atributo season pero anulando el pseudo
  var s = document.getElementById('mc-season-hotfix');
  if (s) s.remove();
  s = document.createElement('style');
  s.id = 'mc-season-hotfix';
  s.textContent = \`
    html[data-season]::before, html[data-season]::after { content:none !important; display:none !important; }
    .season-glow{position:fixed;top:0;left:0;right:0;height:38vh;z-index:36;pointer-events:none;
      opacity:.5;animation:seasonglow 9s ease-in-out infinite alternate;background:var(--season-glow-top);}
    .season-amb{position:fixed;top:0;left:0;right:0;bottom:calc(72px + var(--safe-bottom,0px));z-index:37;pointer-events:none;overflow:hidden;}
    .botnav.botnav-hidden{transform:translateY(120%) !important;opacity:1 !important;pointer-events:none;}
  \`;
  document.head.appendChild(s);
  if (!document.querySelector('.season-glow')) {
    var g = document.createElement('div');
    g.className = 'season-glow';
    g.setAttribute('aria-hidden','true');
    var amb = document.querySelector('.season-amb');
    if (amb && amb.parentNode) amb.parentNode.insertBefore(g, amb);
    else document.querySelector('.app').insertBefore(g, document.querySelector('.app').firstChild);
  }
  return {
    glow: !!document.querySelector('.season-glow'),
    ambBottom: getComputedStyle(document.querySelector('.season-amb')).bottom,
    beforeDisplay: getComputedStyle(document.documentElement,'::before').display
  };
})()`));

const hostScroll = async (y) => ev(`(async function(){
  var h=document.querySelector('.page-scroll-host');
  h.scrollTop = ${y};
  await new Promise(r=>setTimeout(r,500));
  var g=document.querySelector('.season-glow');
  var gc=g&&getComputedStyle(g);
  var n=document.querySelector('.botnav');
  var nc=n&&getComputedStyle(n);
  var br=g&&g.getBoundingClientRect();
  return {
    scrollTop: h.scrollTop,
    glowTop: br && br.top,
    glowOp: gc && gc.opacity,
    glowPos: gc && gc.position,
    navCls: n && n.className,
    navOp: nc && nc.opacity,
    navTy: nc && nc.transform
  };
})()`);

console.log("scroll 0", await hostScroll(0));
console.log("scroll 500", await hostScroll(500));
console.log("scroll 900", await hostScroll(900));
console.log("scroll 0 otra vez", await hostScroll(0));

// El destello debe quedarse con top≈0 en todos los scrolls
const a = await hostScroll(50);
const b = await hostScroll(600);
const okGlow = a.glowTop != null && Math.abs(a.glowTop - b.glowTop) < 2;
const okNav = b.navOp === "1" || b.navOp === 1; // sin fade a 0
console.log(okGlow && okNav ? "VEREDICTO: OK (glow fijo + nav sin opacity 0)" : "VEREDICTO: FALLA", { okGlow, okNav, a, b });

ws.close();
process.exit(okGlow && okNav ? 0 : 1);
