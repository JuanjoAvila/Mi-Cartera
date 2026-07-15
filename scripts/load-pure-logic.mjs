#!/usr/bin/env node
/**
 * Carga la lógica pura del monolito (sin ReactDOM.render ni Service Worker)
 * en un sandbox Node para tests. No parte index.html: extrae el bloque y lo evalúa con mocks.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function extractPureLogicSource(html) {
  const m = html.match(/<script>\s*\/\* =+\s*\n\s*MI CARTERA v3[\s\S]*?<\/script>/i);
  if (!m) throw new Error("No se encontró el bloque principal de la app en index.html");
  let src = m[0].replace(/^<script>\s*/i, "").replace(/<\/script>\s*$/i, "");
  const cut = src.search(/\nclass ErrorBoundary\b/);
  if (cut < 0) throw new Error("No se encontró class ErrorBoundary — revisar el punto de corte");
  return src.slice(0, cut);
}

export function createLogicSandbox(extra = {}) {
  const React = {
    createElement: () => null,
    Component: class {},
    useState: (init) => [typeof init === "function" ? init() : init, () => {}],
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    memo: (fn) => fn,
    Fragment: "Fragment",
  };
  const noop = () => {};
  const el = () => ({ style: {}, classList: { toggle: noop, add: noop, remove: noop }, appendChild: noop, remove: noop, setAttribute: noop, addEventListener: noop });
  const sandbox = {
    React,
    ReactDOM: { createPortal: () => null, createRoot: () => ({ render: noop }) },
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    Intl,
    Math,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    Error,
    CustomEvent: class { constructor() {} },
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    navigator: { serviceWorker: { addEventListener: noop, register: () => Promise.resolve({}) }, userAgent: "node-test" },
    location: { protocol: "https:", reload: noop, href: "https://test/" },
    document: {
      getElementById: () => el(),
      body: el(),
      documentElement: { classList: { toggle: noop }, setAttribute: noop },
      createElement: () => el(),
    },
    window: {
      localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
      matchMedia: () => ({ matches: false }),
      addEventListener: noop,
      dispatchEvent: noop,
      __mcApplyUpdate: noop,
    },
    ...extra,
  };
  sandbox.window.window = sandbox.window;
  sandbox.globalThis = sandbox;
  return sandbox;
}

export function loadPureLogic(html) {
  const src = extractPureLogicSource(html);
  const sandbox = createLogicSandbox();
  vm.runInNewContext(src, sandbox, { filename: "public/index.html:pure-logic" });
  return sandbox;
}

export function loadPureLogicFromFile() {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  return loadPureLogic(html);
}
