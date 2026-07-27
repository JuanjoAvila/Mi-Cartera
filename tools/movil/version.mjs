// Qué versión corre AHORA MISMO su WebView (antes de creerte cualquier medida).
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
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true })).result?.result?.value;
console.log(await ev(`({
  stamped: (document.documentElement.innerHTML.match(/APP_VERSION:\\s*"([^"]+)"/)||[])[1] || null,
  tieneBus: /mcOnGastosActive/.test(document.documentElement.innerHTML),
  activeEnProps: /function Expenses\\(\\{[^}]*active/.test(document.documentElement.innerHTML),
  canal: localStorage.getItem("_mcChannel"),
  pendiente: localStorage.getItem("_otaPending"),
  pages: document.querySelectorAll(".page").length,
  splash: !!document.getElementById("mc-load")
})`));
ws.close();
