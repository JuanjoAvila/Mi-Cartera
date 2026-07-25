#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function newerVer(a, b) {
  a = String(a).split(".");
  b = String(b).split(".");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = parseInt(a[i] || 0, 10);
    const y = parseInt(b[i] || 0, 10);
    if (x !== y) return x > y;
  }
  return false;
}

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

async function ta(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("updates");

t("newerVer: patch mayor", () => {
  assert.equal(newerVer("3.107.0", "3.106.0"), true);
  assert.equal(newerVer("3.106.0", "3.107.0"), false);
});

t("newerVer: igual", () => {
  assert.equal(newerVer("3.106.0", "3.106.0"), false);
});

t("newerVer: segmentos distintos", () => {
  assert.equal(newerVer("3.10.0", "3.9.99"), true);
});

/* ---------- Canal de actualizaciones: el trozo REAL del monolito ----------
   Estos casos existen por un fallo que costó semanas: el canal beta llevaba roto desde que
   GitHub cambió el dominio al que redirigen los assets de las releases, y NO SE VEÍA porque
   `mcFetchManifest` se tragaba cualquier error y leía el manifiesto de producción — el móvil
   contestaba «✓ estás a la última» con la beta publicada delante. Un test que copie la lógica
   aquí no sirve de nada: hay que ejecutar el código que se despliega. */
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const desde = html.indexOf("var _mcOtaBASE=");
const hasta = html.indexOf("window._mcNewerVer=");
assert.ok(desde > 0 && hasta > desde, "no se encontró el bloque de canal/manifiestos en public/index.html");
const fuenteCanal = html.slice(desde, hasta);

function sandboxCanal({ nativo = false, respuestas = {} } = {}) {
  const store = {};
  const pedidas = { fetch: [], nativo: [] };
  const responder = (url) => {
    const clave = Object.keys(respuestas).find((k) => url.indexOf(k) >= 0);
    return respuestas[clave] || { status: 200, body: '{"version":"0.0.0"}' };
  };
  const sandbox = {
    console, JSON, Date, Promise, Error, String, Number, Object, Math, parseInt, setTimeout,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    fetch: (url) => {
      pedidas.fetch.push(url);
      const r = responder(url);
      if (r.red) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, json: () => Promise.resolve(JSON.parse(r.body)) });
    },
    window: {
      Capacitor: nativo ? {
        isNativePlatform: () => true,
        Plugins: {
          CapacitorHttp: {
            request: ({ url }) => {
              pedidas.nativo.push(url);
              const r = responder(url);
              if (r.red) return Promise.reject(new Error("nativo: sin red"));
              return Promise.resolve({ status: r.status, data: r.body });
            },
          },
        },
      } : undefined,
    },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fuenteCanal, sandbox, { filename: "public/index.html:canal" });
  return { sandbox, pedidas, store };
}

await ta("beta: un fallo de red NO se disfraza de «estás a la última»", async () => {
  // El caso de 2026-07-25: los assets de release no mandan CORS, el fetch peta, y la caída a
  // estable hacía que el móvil leyera producción y dijera que no había nada nuevo.
  const { sandbox, pedidas } = sandboxCanal({ respuestas: { "releases/download": { red: true } } });
  sandbox.mcSetChannel("beta");
  await assert.rejects(() => sandbox.mcFetchManifest("version.json"), /beta\/version\.json/);
  assert.equal(pedidas.fetch.filter((u) => u.indexOf("github.io") >= 0).length, 0, "no debe leer el manifiesto estable");
});

await ta("beta: un 5xx tampoco cae a estable", async () => {
  const { sandbox } = sandboxCanal({ respuestas: { "releases/download": { status: 503, body: "" } } });
  sandbox.mcSetChannel("beta");
  await assert.rejects(() => sandbox.mcFetchManifest("version.json"), /HTTP 503/);
});

await ta("beta: un 404 SÍ cae a estable (aún no hay beta publicada)", async () => {
  const { sandbox } = sandboxCanal({
    respuestas: {
      "releases/download": { status: 404, body: "" },
      "github.io": { status: 200, body: '{"version":"4.10.1"}' },
    },
  });
  sandbox.mcSetChannel("beta");
  const r = await sandbox.mcFetchManifest("version.json");
  assert.equal((await r.json()).version, "4.10.1");
});

await ta("en el móvil el manifiesto lo pide ANDROID, no el fetch de la WebView", async () => {
  const { sandbox, pedidas } = sandboxCanal({
    nativo: true,
    respuestas: { "releases/download": { status: 200, body: '{"version":"4.11.0.6"}' } },
  });
  sandbox.mcSetChannel("beta");
  const r = await sandbox.mcFetchManifest("version.json");
  assert.equal((await r.json()).version, "4.11.0.6");
  assert.equal(pedidas.fetch.length, 0, "los assets de release no llevan CORS: el fetch de la WebView nunca vale");
  assert.equal(pedidas.nativo.length, 1);
});

t("la beta se sella con el MISMO número que anuncia su manifiesto", () => {
  /* Si el bundle lleva dentro `4.11.0` y el manifiesto anuncia `4.11.0.7`, la app no alcanza nunca
     la versión anunciada: `_mcNewerVer` da true para siempre y el móvil ofrece la MISMA beta una y
     otra vez, con Ajustes marcando un número que no es el que llevas. Pasó de verdad en cuanto la
     primera beta llegó a su móvil: «todo el maldito rato sale para actualizar» (2026-07-26). */
  const yml = fs.readFileSync(path.join(root, ".github", "workflows", "beta.yml"), "utf8");
  assert.match(yml, /MC_STAMP_VERSION:\s*\$\{\{\s*steps\.num\.outputs\.beta\s*\}\}/,
    "beta.yml tiene que sellar el bundle con el número de la beta, no con VERSION a pelo");
  assert.match(yml, /BETA="\$\{\{\s*steps\.num\.outputs\.beta\s*\}\}"/,
    "el manifiesto tiene que salir del MISMO sitio que el sello");
  const stamp = fs.readFileSync(path.join(root, "scripts", "stamp-version.mjs"), "utf8");
  assert.match(stamp, /process\.env\.MC_STAMP_VERSION/, "stamp-version.mjs debe aceptar el override");
});

await ta("estable: sigue leyendo de Pages", async () => {
  const { sandbox, pedidas } = sandboxCanal({ respuestas: { "github.io": { status: 200, body: '{"version":"4.10.1"}' } } });
  const r = await sandbox.mcFetchManifest("version.json");
  assert.equal((await r.json()).version, "4.10.1");
  assert.ok(pedidas.fetch[0].indexOf("juanjoavila.github.io") >= 0);
});
