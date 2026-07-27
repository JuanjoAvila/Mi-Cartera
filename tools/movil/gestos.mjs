// LA COMPROBACIÓN: con su dedo, ¿siguen cancelándose los gestos y volviéndose las deslizadas?
// Números que tienen que bajar: gestos cancelados (eran 174 de 185) y arrastres que vuelven a
// la misma pestaña (eran 6 de 18).
import fs from 'node:fs';
const SEG = Number(process.argv[2] || 60);
const l = await (await fetch('http://localhost:9222/json/list')).json();
const p = l.find(x => x.type === 'page');
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0; const q = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); } });
await new Promise(r => ws.addEventListener('open', r));
const ev = async x => (await new Promise(res => { const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: x, returnByValue: true } })); })).result?.result?.value;

await ev(`(function(){
  if (window.__z) { window.__z.stop = true; try{ document.removeEventListener('touchstart', window.__z.hs, true); document.removeEventListener('touchcancel', window.__z.hc, true); document.removeEventListener('touchend', window.__z.he, true);}catch(e){} }
  var Z = { toques:0, cancelados:0, fines:0, mov: [], stop:false }; window.__z = Z;
  Z.hs = function(){ Z.toques++; }; Z.hc = function(){ Z.cancelados++; }; Z.he = function(){ Z.fines++; };
  document.addEventListener('touchstart', Z.hs, true);
  document.addEventListener('touchcancel', Z.hc, true);
  document.addEventListener('touchend', Z.he, true);
  var tr = document.querySelector('.track'), cur = null, prevX = null, quietos = 0;
  function tabAhora(){ var b = document.querySelector('.botnav-tab.active'); return b ? b.textContent.trim() : '?'; }
  function loop(t){
    if (Z.stop) return;
    var x = new DOMMatrixReadOnly(getComputedStyle(tr).transform).m41;
    if (prevX !== null) {
      var dx = x - prevX;
      if (Math.abs(dx) > 0.2) { if (!cur) cur = { desde: tabAhora(), gastos: Math.round(document.querySelectorAll('.page')[1].scrollTop), t0: t }; quietos = 0; }
      else if (cur && ++quietos > 12) { cur.hasta = tabAhora(); cur.dur = Math.round(t - cur.t0); Z.mov.push(cur); cur = null; quietos = 0; }
    }
    prevX = x; requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return 'ok';
})()`);
console.log(`>>> ${SEG}s — haz TU repro <<<`);
await new Promise(r => setTimeout(r, SEG * 1000));
const Z = JSON.parse(await ev('JSON.stringify(window.__z)'));
await ev('window.__z.stop=true');
fs.writeFileSync('final.json', JSON.stringify(Z));
const vuelven = Z.mov.filter(m => m.desde === m.hasta).length;
console.log(`\ngestos: ${Z.toques} toques · ${Z.fines} terminados bien · ${Z.cancelados} CANCELADOS por el navegador`);
console.log(`arrastres del carrusel: ${Z.mov.length}   ·   VUELVEN a la misma pestaña: ${vuelven}`);
Z.mov.forEach((m, i) => console.log(`   ${String(i + 1).padStart(2)}  ${(m.desde + '→' + m.hasta).padEnd(18)} Gastos=${String(m.gastos).padStart(5)}  ${String(m.dur).padStart(5)}ms  ${m.desde === m.hasta ? '<<< NO CAMBIÓ' : ''}`));
ws.close();
