// Medidor ligero (coste cero) con TODO el contexto de su repro: pestaña, scroll de cada página,
// si la barra de abajo está escondida o animándose, y si el carrusel está arrastrando o en
// transición. Cada frame perdido queda etiquetado con el estado exacto en que ocurrió.
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
  if (window.__v) window.__v.stop = true;
  var V = { g: [], ev: [], stop:false, n:0, t0: performance.now() }; window.__v = V;
  function ctx(){
    var bar = document.querySelector('.botnav');
    var tr  = document.querySelector('.track');
    var b   = document.querySelector('.botnav-tab.active');
    var ps  = [].slice.call(document.querySelectorAll('.page'));
    var anim = 0; try { anim = bar.getAnimations().length + tr.getAnimations().length; } catch(e){}
    return {
      tab: b ? b.textContent.trim() : 'AJUSTES/PERFIL',
      sc: ps.map(function(x){ return Math.round(x.scrollTop); }).join('/'),
      barra: bar.classList.contains('botnav-hidden') ? 'OCULTA' : 'visible',
      anim: anim,
      arr: tr.classList.contains('dragging') ? 'ARRASTRANDO' : '',
      blur: document.querySelector('.app-shell').classList.contains('nav-sin-blur') ? 'sin-blur' : 'con-blur'
    };
  }
  var last = 0;
  function loop(t){
    if (V.stop) return;
    if (last) { var d = t - last; V.n++; if (d > 20) V.g.push([Math.round(t), Math.round(d), ctx()]); }
    last = t; V.ultimo = t; requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  try { new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if (/^touchstart$|^touchend$/.test(e.name)) V.ev.push([e.name, Math.round(e.startTime), Math.round(e.processingStart - e.startTime)]); }); }).observe({ type:'event', durationThreshold: 16 }); } catch(e){}
  return 'vigilando';
})()`);
console.log(`>>> MIDIENDO ${SEG}s — haz TU repro <<<`);
await new Promise(r => setTimeout(r, SEG * 1000));
const V = JSON.parse(await ev('JSON.stringify(window.__v)'));
await ev('window.__v.stop=true');
fs.writeFileSync('vigila2.json', JSON.stringify(V));
const dur = (V.ultimo - V.t0) / 1000;
const g = V.g;
console.log(`fps medio ${(V.n / dur).toFixed(1)}   toques ${V.ev.length}`);
console.log(`frames perdidos: ${g.length}   >50ms: ${g.filter(x => x[1] > 50).length}   >100ms: ${g.filter(x => x[1] > 100).length}`);
console.log('\n   t(s)   frame  pestaña   scroll(4 páginas)      barra     otros');
for (const [t, d, c] of g.filter(x => x[1] > 25))
  console.log(`${(t / 1000).toFixed(2).padStart(8)} ${String(d).padStart(5)}ms  ${String(c.tab).padEnd(8)} ${String(c.sc).padEnd(22)} ${c.barra.padEnd(8)} ${c.arr} ${c.blur} anim=${c.anim}`);
ws.close();
