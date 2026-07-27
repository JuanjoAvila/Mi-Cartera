// Igual que banco3 pero midiendo SOLO la ventana del desliz de vuelta a Gastos (1,4 s),
// que es donde él nota el tirón. Fuera de esa ventana todo es scroll y diluye la señal.
import { execFileSync } from 'node:child_process';
const ADB = 'C:/Users/juanj/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const adb = (...a) => { try { execFileSync(ADB, a, { stdio: 'pipe' }); } catch (e) {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const l = await (await fetch('http://localhost:9222/json/list')).json();
const p = l.find(x => x.type === 'page');
const ws = new WebSocket(p.webSocketDebuggerUrl);
let id = 0; const q = new Map(); let frames = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && q.has(m.id)) { q.get(m.id)(m); q.delete(m.id); return; }
  if (m.method === 'Tracing.dataCollected') for (const x of m.params.value) {
    const fr = x.name === 'PipelineReporter' && x.args && x.args.frame_reporter;
    if (fr && fr.state) frames.push(fr);
  }
  if (m.method === 'Tracing.tracingComplete') { const f = q.get('fin'); if (f) f(); }
});
await new Promise(r => ws.addEventListener('open', r));
const send = (m, p2 = {}) => new Promise(res => { const mid = ++id; q.set(mid, res); ws.send(JSON.stringify({ id: mid, method: m, params: p2 })); });
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;
const tab = () => ev(`(function(){var b=document.querySelector('.botnav-tab.active');return b?b.textContent.trim():'?'})()`);
async function irA(nombre, dir) {
  for (let i = 0; i < 4; i++) {
    if (await tab() === nombre) return true;
    adb('shell', 'input', 'swipe', ...(dir === 'izq' ? ['1150', '1200', '220', '1200', '200'] : ['300', '1200', '1250', '1200', '200']));
    await sleep(1100);
  }
  return (await tab()) === nombre;
}

const CONF = [
  ['A · SU CASO MALO (Gastos arriba)', true, ''],
  ['B · su caso fluido (Gastos bajado)', false, ''],
  ['C · malo, barra sin DESENFOQUE', true, '.botnav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}'],
  ['D · malo, barra sin TRANSICIÓN', true, '.botnav{transition:none!important;}'],
  ['E · malo, barra sin las dos cosas', true, '.botnav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:none!important;}'],
];
const res = {};
const RONDAS = Number(process.argv[2] || 3);

for (let r = 0; r < RONDAS; r++) {
  for (const [et, arriba, css] of CONF) {
    await ev(`(function(){var s=document.getElementById('__p');if(!s){s=document.createElement('style');s.id='__p';document.head.appendChild(s);}s.textContent=${JSON.stringify(css)};return 1})()`);
    adb('shell', 'input', 'tap', '432', '2978'); await sleep(1200);
    if (!await irA('Gastos', 'der')) continue;
    await ev(`(function(){document.querySelectorAll('.page')[1].scrollTop=${arriba ? 0 : 1200};return 1})()`);
    await sleep(600);
    let caidos = 0, total = 0;
    for (let v = 0; v < 3; v++) {
      if (!await irA('Plan', 'izq')) break;
      for (let i = 0; i < 5; i++) { adb('shell', 'input', 'swipe', '720', '2300', '720', '1200', '80'); await sleep(140); }
      await sleep(80);
      frames = [];
      const fin = new Promise(x => q.set('fin', x));
      await send('Tracing.start', { categories: '-*,cc,benchmark,disabled-by-default-devtools.timeline.frame,toplevel', transferMode: 'ReportEvents' });
      adb('shell', 'input', 'swipe', '300', '1200', '1250', '1200', '200');   // ← LA VENTANA
      await sleep(1400);
      await send('Tracing.end'); await fin;
      caidos += frames.filter(f => f.state === 'STATE_DROPPED').length;
      total += frames.length;
      await sleep(400);
    }
    const pct = 100 * caidos / Math.max(1, total);
    (res[et] = res[et] || []).push(pct);
    console.log(`  r${r + 1}  ${et.padEnd(40)} ${String(caidos).padStart(3)}/${String(total).padStart(4)} = ${pct.toFixed(2)} %`);
  }
}
await ev(`(function(){var s=document.getElementById('__p');if(s)s.textContent='';return 1})()`);
console.log('\n=== MEDIANA (solo el desliz de vuelta) ===');
for (const k of Object.keys(res)) {
  const v = res[k].slice().sort((a, b) => a - b);
  console.log(`  ${k.padEnd(40)} ${v[Math.floor(v.length / 2)].toFixed(2)} %    (${v.map(x => x.toFixed(1)).join(' · ')})`);
}
ws.close();
