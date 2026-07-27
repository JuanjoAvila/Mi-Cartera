// PASIVO: mientras él usa la app, apunta CADA movimiento del carrusel frame a frame y saca su
// perfil (cuántos frames, cuánto duró, si se paró en mitad, si pegó un salto), con el contexto
// (de qué pestaña a cuál, el scroll de Gastos, si la barra estaba escondida).
// Mide LO QUE SE MUEVE, que es lo que el ojo llama fluidez — no cuántos frames se entregan.
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
  if (window.__f) window.__f.stop = true;
  var F = { mov: [], stop:false }; window.__f = F;
  var tr = document.querySelector('.track');
  var cur = null, prevX = null, quietos = 0;
  function ctx(){
    var b = document.querySelector('.botnav-tab.active');
    var ps = [].slice.call(document.querySelectorAll('.page'));
    return { tab: b ? b.textContent.trim() : '?', gastos: Math.round(ps[1].scrollTop), plan: Math.round(ps[2].scrollTop),
             barra: document.querySelector('.botnav').classList.contains('botnav-hidden') ? 'OCULTA' : 'visible',
             arr: tr.classList.contains('dragging') ? 1 : 0 };
  }
  function loop(t){
    if (F.stop) return;
    var x = new DOMMatrixReadOnly(getComputedStyle(tr).transform).m41;
    if (prevX !== null) {
      var dx = x - prevX;
      if (Math.abs(dx) > 0.2) {
        if (!cur) cur = { t0: t, desde: ctx(), pts: [] };
        quietos = 0;
        cur.pts.push([Math.round(t*10)/10, Math.round(x*10)/10, tr.classList.contains('dragging')?1:0]);
      } else if (cur) {
        cur.pts.push([Math.round(t*10)/10, Math.round(x*10)/10, tr.classList.contains('dragging')?1:0]);
        if (++quietos > 12) { cur.hasta = ctx(); F.mov.push(cur); cur = null; quietos = 0; }
      }
    }
    prevX = x;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return 'ok';
})()`);
console.log(`>>> MIDIENDO ${SEG}s — haz TU repro <<<`);
await new Promise(r => setTimeout(r, SEG * 1000));
const F = JSON.parse(await ev('JSON.stringify(window.__f)'));
await ev('window.__f.stop=true');
fs.writeFileSync('fluidez.json', JSON.stringify(F));
console.log(`\nmovimientos del carrusel: ${F.mov.length}\n`);
console.log('  #   desde→hasta        Gastos  barra      frames  dur    peorHueco  parones  salto');
F.mov.forEach((m, i) => {
  const pts = m.pts;
  let peor = 0, parones = 0, salto = 0;
  for (let k = 1; k < pts.length; k++) {
    const dt = pts[k][0] - pts[k - 1][0], dx = Math.abs(pts[k][1] - pts[k - 1][1]);
    if (dt > peor) peor = dt;
    if (dx < 0.2 && k < pts.length - 12) parones++;
    if (dx > salto) salto = dx;
  }
  const dur = Math.round(pts[pts.length - 1][0] - pts[0][0]);
  console.log(`  ${String(i + 1).padStart(2)}  ${(m.desde.tab + '→' + m.hasta.tab).padEnd(18)} ${String(m.desde.gastos).padStart(5)}  ${m.desde.barra.padEnd(8)} ${String(pts.length).padStart(6)}  ${String(dur).padStart(4)}ms ${peor.toFixed(1).padStart(9)}ms ${String(parones).padStart(7)} ${salto.toFixed(0).padStart(6)}px`);
});
ws.close();
