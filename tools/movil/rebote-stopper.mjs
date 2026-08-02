// AD-HOC (2026-08-02): el "stopper" del rebote vertical al final de la lista — gesto NUEVO de
// ayer (se quitó el rebote JS propio y ahora es el rubber-band nativo). No estaba cubierto por
// el resto de tools/movil/, que miden el swipe HORIZONTAL entre pestañas.
// v2: identifica la página de Gastos por su posición real en tabIds (no por índice fijo) y marca
// el instante en que scrollTop llega a su máximo (ahí empieza el rebote de verdad).
import fs from 'node:fs';
const SEG = Number(process.argv[2] || 25);
const l = await (await fetch('http://localhost:9222/json/list')).json();
const p = l.find(x => x.type === 'page');
if (!p) { console.error('No hay página activa en la WebView'); process.exit(1); }
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0; const q = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); } });
await new Promise(r => ws.addEventListener('open', r));
const ev = async x => (await new Promise(res => { const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: x, returnByValue: true, awaitPromise:false } })); })).result?.result?.value;

console.log('Página:', p.title);

await ev(`(function(){
  if (window.__rb) { window.__rb.stop = true; }
  var R = { stop:false, log:[], t0: performance.now() };
  window.__rb = R;
  function activo(){
    var b = document.querySelector('.botnav-tab.active');
    return b ? b.getAttribute('data-tour') : '?';
  }
  function pagActiva(){
    var idx = Array.from(document.querySelectorAll('.botnav-tab')).findIndex(function(b){ return b.classList.contains('active'); });
    var ps = document.querySelectorAll('.page');
    var el = ps[idx];
    if (!el) return null;
    return { st: Math.round(el.scrollTop), sh: el.scrollHeight, ch: el.clientHeight, max: el.scrollHeight-el.clientHeight };
  }
  ['touchstart','touchmove','touchend','touchcancel'].forEach(function(name){
    document.addEventListener(name, function(e){
      R.log.push({ t: Math.round(performance.now()-R.t0), ev:name, tab: activo(), p: pagActiva(), y: e.touches[0]?Math.round(e.touches[0].clientY):null });
    }, {capture:true, passive:true});
  });
  true;
})()`);

console.log('Capturando ' + SEG + ' s.');
console.log('AHORA: 1) baja del todo en Gastos y PARA quieto 2s  2) tira una vez y suelta  3) espera 1s  4) tira otra vez.');
await new Promise(r => setTimeout(r, SEG * 1000));

const data = await ev(`(function(){ window.__rb.stop=true; return JSON.stringify(window.__rb.log); })()`);
const log = JSON.parse(data);
fs.writeFileSync('tools/movil/rebote-stopper.json', JSON.stringify(log, null, 2));
console.log(log.length + ' eventos.');
ws.close();
