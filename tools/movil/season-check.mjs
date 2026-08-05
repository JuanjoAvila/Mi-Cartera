// Diagnóstico del destello de temporada + barra en el móvil (CDP).
import { writeFileSync } from "node:fs";
const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const p = l.find((x) => x.type === "page");
if (!p) throw new Error("sin página CDP");
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

await send("Page.enable");
const snap = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const data = r && (r.data || (r.result && r.result.data));
  if (!data) { console.log("shot FAIL", name, JSON.stringify(r).slice(0,200)); return; }
  writeFileSync(name, Buffer.from(data, "base64"));
  console.log("shot", name, Math.round(data.length/1024), "KB");
};

console.log("estado", await ev(`({
  ver: (window.CONFIG&&CONFIG.APP_VERSION)||'?',
  season: document.documentElement.getAttribute('data-season'),
  before: (function(){
    var b=getComputedStyle(document.documentElement,'::before');
    return {z:b.zIndex,pos:b.position,h:b.height,op:b.opacity,content:b.content,display:b.display,transform:b.transform,bg:(b.backgroundImage||'').slice(0,120)};
  })(),
  host: (function(){
    var h=document.querySelector('.page-scroll-host'); if(!h) return null;
    var c=getComputedStyle(h);
    return {cls:h.className, bgImg:(c.backgroundImage||'').slice(0,100), bgAttach:c.backgroundAttachment, bgColor:c.backgroundColor, z:c.zIndex, scrollTop:h.scrollTop, transform:c.transform};
  })(),
  shell: (document.querySelector('.app-shell')||{}).className||null,
  nav: (function(){
    var n=document.querySelector('.botnav'); if(!n) return null;
    var c=getComputedStyle(n);
    return {cls:n.className, bg:c.backgroundColor, z:c.zIndex, backdrop:c.backdropFilter||c.webkitBackdropFilter, opacity:c.opacity, transform:c.transform};
  })(),
  amb: (function(){
    var a=document.querySelector('.season-amb'); if(!a) return null;
    var c=getComputedStyle(a);
    return {z:c.zIndex,pos:c.position,parent:a.parentElement&&a.parentElement.className, display:c.display};
  })()
})`));

await snap("tools/movil/_season-top.png");

// Scroll down inside host
console.log("scroll…", await ev(`(async function(){
  var h=document.querySelector('.page-scroll-host');
  if(!h) return 'no-host';
  h.scrollTop = 420;
  await new Promise(r=>setTimeout(r, 700));
  var n=document.querySelector('.botnav');
  var nc=n&&getComputedStyle(n);
  var b=getComputedStyle(document.documentElement,'::before');
  var hc=getComputedStyle(h);
  return {
    scrollTop: h.scrollTop,
    before: {z:b.zIndex, pos:b.position, op:b.opacity, transform:b.transform},
    hostBgAttach: hc.backgroundAttachment,
    hostBgImg: (hc.backgroundImage||'').slice(0,80),
    shell: (document.querySelector('.app-shell')||{}).className,
    nav: n && {cls:n.className, bg:nc.backgroundColor, opacity:nc.opacity, transform:nc.transform, backdrop:nc.backdropFilter||nc.webkitBackdropFilter}
  };
})()`));

await snap("tools/movil/_season-scrolled.png");

// Wait ~1s like he describes
await ev(`new Promise(r=>setTimeout(r,1100))`);
console.log("después 1.1s", await ev(`({
  shell: (document.querySelector('.app-shell')||{}).className,
  nav: (function(){
    var n=document.querySelector('.botnav'); if(!n) return null;
    var c=getComputedStyle(n);
    return {cls:n.className, bg:c.backgroundColor, opacity:c.opacity, transform:c.transform};
  })(),
  scrollTop: (document.querySelector('.page-scroll-host')||{}).scrollTop
})`));
await snap("tools/movil/_season-after1s.png");

ws.close();
