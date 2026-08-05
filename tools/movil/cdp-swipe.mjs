// Swipe horizontal preciso vía CDP Input.dispatchTouchEvent (más fiable que `adb input swipe`
// para que el reconocedor de gestos de la app lo detecte como "tab", con muchos puntos intermedios).
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

const [x1, y1, x2, y2, durMs, steps] = process.argv.slice(2).map(Number);
const n = steps || 24;
const pts = [];
for (let i = 0; i <= n; i++) {
  const t = i / n;
  pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
}
const stepDelay = (durMs || 220) / n;

const touchPoint = (x, y) => ([{ x, y, radiusX: 5, radiusY: 5, force: 1, id: 1 }]);

await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touchPoint(pts[0].x, pts[0].y) });
for (let i = 1; i < pts.length; i++) {
  await new Promise((r) => setTimeout(r, stepDelay));
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touchPoint(pts[i].x, pts[i].y) });
}
await new Promise((r) => setTimeout(r, stepDelay));
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
console.log("swipe enviado", { x1, y1, x2, y2, durMs, n });
ws.close();
