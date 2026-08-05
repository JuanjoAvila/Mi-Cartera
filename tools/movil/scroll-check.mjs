// Comprobación barata: ¿llega el evento "scroll" a .page cuando haces scroll normal en Gastos?
// Si el contador se queda a 0 mientras arrastras, .page no está recibiendo scroll de verdad ahí.
const SEG = Number(process.argv[2] || 12);
const l = await (await fetch('http://localhost:9222/json/list')).json();
const p = l.find(x => x.type === 'page');
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0; const q = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); } });
await new Promise(r => ws.addEventListener('open', r));
const ev = async x => (await new Promise(res => { const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: x, returnByValue: true } })); })).result?.result?.value;

await ev(`(function(){
  window.__sc = { scrolls:0, touchmoves:0, maxSt:0, lastSt:0, tab:null };
  function tabAhora(){ var b=document.querySelector('.botnav-tab.active'); return b?b.textContent.trim():'?'; }
  document.addEventListener('scroll', function(e){
    window.__sc.scrolls++;
    if (e.target && typeof e.target.scrollTop==='number'){ window.__sc.lastSt=e.target.scrollTop; if(e.target.scrollTop>window.__sc.maxSt) window.__sc.maxSt=e.target.scrollTop; }
    window.__sc.tab = tabAhora();
  }, true);
  document.addEventListener('touchmove', function(){ window.__sc.touchmoves++; }, {capture:true, passive:true});
  true;
})()`);

console.log('Capturando ' + SEG + 's — haz un scroll normal (sin llegar al final) en Gastos, arriba y abajo un par de veces.');
await new Promise(r => setTimeout(r, SEG * 1000));
const r = await ev('JSON.stringify(window.__sc)');
console.log(r);
ws.close();
