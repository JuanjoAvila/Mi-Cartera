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
  const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return r.result?.result?.value;
};

// Parchear Expenses y remontar App para contar renders + ver si sigue llegando `active`
const patch = await ev(`(function(){
  try {
    if (typeof Expenses !== "function" || typeof App !== "function") return {ok:false, why:"no-globals"};
    if (window.__mcPatched) return {ok:true, already:true};
    var Orig = Expenses;
    window.__expRenders = 0;
    window.__expActiveHist = [];
    Expenses = function McWrap(props){
      window.__expRenders++;
      window.__expActiveHist.push(props && props.active);
      if (window.__expActiveHist.length > 20) window.__expActiveHist.shift();
      return React.createElement(Orig, props);
    };
    var root = document.getElementById("root");
    root.innerHTML = "";
    ReactDOM.createRoot(root).render(React.createElement(ErrorBoundary, null, React.createElement(App)));
    window.__mcPatched = true;
    return {ok:true, len: Orig.length};
  } catch (e) {
    return {ok:false, err:String(e), stack:e&&e.stack};
  }
})()`);
console.log("patch", patch);
await sleep(3500);

const boot = await ev(`({
  pages: document.querySelectorAll(".page").length,
  renders: window.__expRenders,
  activeHist: window.__expActiveHist,
  stamped: (document.documentElement.innerHTML.match(/APP_VERSION:\\s*"([^"]+)"/)||[])[1]
})`);
console.log("boot", boot);

async function clickTab(label) {
  await ev(`(function(){
    var b=[].slice.call(document.querySelectorAll(".botnav-tab")).find(function(x){return (x.textContent||"").indexOf("${label}")>=0;});
    if(b) b.click();
  })()`);
  await sleep(900);
}

await clickTab("Gastos");
const r1 = await ev(`({renders:window.__expRenders, hist:window.__expActiveHist.slice(), active:(document.querySelector(".botnav-tab.active")||{}).textContent})`);
console.log("on Gastos", r1);

await clickTab("Plan");
await ev(`(function(){
  var b=[].slice.call(document.querySelectorAll(".v4-seg-btn")).find(function(x){return /Deuda/i.test(x.textContent);});
  if(b) b.click();
})()`);
await sleep(500);
const before = await ev(`window.__expRenders`);
for (let i = 0; i < 5; i++) {
  adb("shell", "input", "swipe", "720", "2300", "720", "1100", "90");
  await sleep(100);
}
await sleep(200);
const meta = await ev(`({dpr:devicePixelRatio,w:innerWidth,h:innerHeight})`);
const y = Math.round(meta.h * 0.45 * meta.dpr);
const rendersBeforeSwipe = await ev(`window.__expRenders`);
adb("shell", "input", "swipe", String(Math.round(meta.w * 0.15 * meta.dpr)), String(y), String(Math.round(meta.w * 0.85 * meta.dpr)), String(y), "220");
await sleep(1600);
const afterG = await ev(`({renders:window.__expRenders, delta:window.__expRenders-${rendersBeforeSwipe}, hist:window.__expActiveHist.slice(-6), active:(document.querySelector(".botnav-tab.active")||{}).textContent})`);
console.log("Plan→Gastos swipe", afterG);

await clickTab("Plan");
await sleep(400);
const beforeC = await ev(`window.__expRenders`);
adb("shell", "input", "swipe", String(Math.round(meta.w * 0.85 * meta.dpr)), String(y), String(Math.round(meta.w * 0.15 * meta.dpr)), String(y), "220");
await sleep(1600);
const afterC = await ev(`({renders:window.__expRenders, delta:window.__expRenders-${beforeC}, hist:window.__expActiveHist.slice(-6), active:(document.querySelector(".botnav-tab.active")||{}).textContent})`);
console.log("Plan→Cartera swipe", afterC);

console.log("\nSi Plan→Gastos delta > Plan→Cartera delta, active sigue provocando re-renders.");
ws.close();
