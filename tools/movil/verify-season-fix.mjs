// BEFORE (build .9) vs AFTER (inyección del fix portal+opaco) — evidencia por píxeles.
import { writeFileSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ADB = process.env.LOCALAPPDATA + "\\Android\\Sdk\\platform-tools\\adb.exe";

function readPngBuf(buf) {
  let off = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    off += 8 + len + 4;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : 3;
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  let ro = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[ro++]; const rs = y * stride;
    for (let x = 0; x < stride; x++) {
      const rb = raw[ro + x];
      const a = x >= ch ? out[rs + x - ch] : 0;
      const b = y > 0 ? out[rs - stride + x] : 0;
      const c = (x >= ch && y > 0) ? out[rs - stride + x - ch] : 0;
      let v = rb;
      if (f === 1) v = rb + a;
      else if (f === 2) v = rb + b;
      else if (f === 3) v = rb + Math.floor((a + b) / 2);
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = rb + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
      }
      out[rs + x] = v & 255;
    }
    ro += stride;
  }
  return { width, height, channels: ch, data: out };
}
function px(img, x, y) {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
function avg(img, x0, y0, w, h) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const p = px(img, x, y); r += p[0]; g += p[1]; b += p[2]; n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}
function adbShot(name) {
  const abs = join(ROOT, name);
  const buf = execSync(`"${ADB}" exec-out screencap -p`, { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(abs, buf);
  return readPngBuf(buf);
}
function sample(img, label) {
  const tr = avg(img, Math.floor(img.width * 0.78), Math.floor(img.height * 0.04), 40, 40);
  const nav = avg(img, Math.floor(img.width * 0.35), Math.floor(img.height * 0.93), 80, 25);
  const above = avg(img, Math.floor(img.width * 0.35), Math.floor(img.height * 0.85), 80, 25);
  const d = nav.map((v, i) => v - above[i]);
  const bleed = Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]);
  return { label, tr, nav, above, bleed };
}
function delta(a, b) { return b.map((v, i) => v - a[i]); }
function sumAbs(d) { return d.reduce((s, v) => s + Math.abs(v), 0); }

const l = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = l.find((x) => x.type === "page");
if (!page) throw new Error("sin CDP — adb forward?");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const q = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (m, p = {}) => new Promise((res) => {
  const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: m, params: p }));
});
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;

const prep = `(async function(){
  var h=document.querySelector('.page-scroll-host');
  if(h) h.scrollTop=0;
  var gTab=document.querySelector('.botnav-tab[data-tour="gastos"]');
  if(gTab && !gTab.classList.contains('active')) gTab.click();
  await new Promise(r=>setTimeout(r,500));
})()`;

const FIX_CSS = `
  .season-portal{position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);
    width:100%;max-width:520px;pointer-events:none;z-index:36;}
  .season-glow{position:absolute!important;top:0;left:0;right:0;height:38vh;z-index:1;pointer-events:none;
    opacity:.7;animation:seasonglowfix 9s ease-in-out infinite alternate;background:var(--season-glow-top);}
  @keyframes seasonglowfix{0%{opacity:.55;}100%{opacity:.85;}}
  .season-amb{position:absolute!important;top:0;left:0;right:0;bottom:calc(72px + var(--safe-bottom,0px));z-index:2;pointer-events:none;overflow:hidden;}
  .botnav{background:var(--bg-2)!important;}
`;

const applyFix = `(function(){
  var s=document.getElementById('mc-season-portal-fix');
  if(!s){ s=document.createElement('style'); s.id='mc-season-portal-fix'; document.head.appendChild(s); }
  s.textContent = ${JSON.stringify(FIX_CSS)};
  var glow=document.querySelector('.season-glow');
  var amb=document.querySelector('.season-amb');
  if(!glow||!amb) return {ok:false, why:'no layers'};
  var portal=document.querySelector('.season-portal');
  if(!portal){
    portal=document.createElement('div');
    portal.className='season-portal';
    portal.setAttribute('aria-hidden','true');
    document.body.appendChild(portal);
    portal.appendChild(glow);
    portal.appendChild(amb);
  }
  return {
    ok:true,
    glowParent:glow.parentElement&&glow.parentElement.className,
    navBg:getComputedStyle(document.querySelector('.botnav')).backgroundColor
  };
})()`;

async function measurePhase(prefix) {
  await ev(prep);
  const rest = sample(adbShot(`tools/movil/${prefix}_rest.png`), "rest");
  await ev(`(async function(){ var h=document.querySelector('.page-scroll-host'); h.scrollTop=600; await new Promise(r=>setTimeout(r,500)); })()`);
  const scrolled = sample(adbShot(`tools/movil/${prefix}_scroll.png`), "scroll");
  await ev(prep);
  const W = await ev(`window.innerWidth`);
  const H = await ev(`window.innerHeight`);
  const y = Math.floor(H * 0.35);
  const x1 = Math.floor(W * 0.85), x2 = Math.floor(W * 0.15);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y, id: 1 }] });
  for (let i = 1; i <= 5; i++) {
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x1 + (x2 - x1) * (i / 5), y, id: 1 }] });
    await new Promise((r) => setTimeout(r, 40));
  }
  const swipe = sample(adbShot(`tools/movil/${prefix}_swipe.png`), "swipe");
  const navState = await ev(`({
    shell:(document.querySelector('.app-shell')||{}).className,
    navBg:getComputedStyle(document.querySelector('.botnav')).backgroundColor,
    glowParent:(document.querySelector('.season-glow')||{}).parentElement&&document.querySelector('.season-glow').parentElement.className
  })`);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return { rest, scrolled, swipe, navState, glowScrollDelta: sumAbs(delta(rest.tr, scrolled.tr)) };
}

console.log("=== BEFORE (build .9 sin fix) ===");
const before = await measurePhase("verify_before");
console.log(JSON.stringify(before, null, 2));

console.log("\n=== APPLY FIX (portal + botnav opaco) ===");
console.log(await ev(applyFix));

console.log("\n=== AFTER (inyectado) ===");
const after = await measurePhase("verify_after");
console.log(JSON.stringify(after, null, 2));

console.log("\n=== VEREDICTO ===");
console.log("glow scroll delta BEFORE:", before.glowScrollDelta, before.glowScrollDelta > 20 ? "BUG" : "ok");
console.log("glow scroll delta AFTER:", after.glowScrollDelta, after.glowScrollDelta <= 12 ? "FIXED" : "STILL BUG");
console.log("nav bleed swipe BEFORE:", before.swipe.bleed);
console.log("nav bleed swipe AFTER:", after.swipe.bleed, after.swipe.bleed <= before.swipe.bleed ? "improved/same" : "worse");
console.log("nav bg AFTER:", after.navState.navBg);
console.log("glow parent AFTER:", after.navState.glowParent);

ws.close();
