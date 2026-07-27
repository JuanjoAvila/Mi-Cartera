#!/usr/bin/env node
/**
 * GENERA LOS ICONOS NATIVOS DE ANDROID a partir de la marca de la app.
 *
 * POR QUÉ EXISTE (2026-07-26): el icono de la app instalada y el splash nativo eran todavía **el
 * de por defecto de Capacitor** —la X azul sobre blanco— mientras que la pantalla de carga web
 * lleva la cartera verde de la marca desde la 4.10.0. Quien instalaba la app veía: X azul en el
 * escritorio → destello blanco con la X → marca verde. Tres identidades distintas en dos segundos,
 * y la primera impresión es justo esa. Petición desde el móvil: «icono de la app que sea único
 * tanto en la pantalla de carga como en la apk instalada».
 *
 * CÓMO: rasteriza el mismo SVG que usa el splash web con el Chromium que ya trae Playwright (que
 * está en devDependencies para los e2e). Cero dependencias nuevas, cero binarios que instalar, y
 * el día que cambie la marca esto se vuelve a lanzar y salen los 15 ficheros alineados.
 *
 *   node scripts/iconos.mjs
 *
 * Los PNG resultantes van al repo (son fuente para el APK). Tras lanzarlo hace falta **recompilar
 * el APK**: un icono nativo NO viaja por OTA.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const res = path.join(root, "android", "app", "src", "main", "res");

/* La marca: los mismos colores y el mismo trazo que `#mc-load` en src/shell.html. */
const FONDO = "#0C1712";
const MENTA = "#5FD08A";
const GLIFO = `<g fill="none" stroke="${MENTA}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.7" y="5.6" width="18.6" height="12.8" rx="3.4"/>
    <path d="M21.3 9.8h-3a2.2 2.2 0 0 0 0 4.4h3"/>
  </g>
  <circle cx="18.1" cy="12" r=".95" fill="${MENTA}"/>`;

/** Una página HTML con el icono dibujado a `px` píxeles.
 *  `escala` = cuánto ocupa el glifo sobre el lienzo (los iconos adaptativos de Android recortan
 *  hasta un 33 % por cada lado, así que el primer plano va pequeño y centrado). */
function pagina({ px, escala, fondo, redondo }) {
  const lado = 24 / escala;
  const off = (lado - 24) / 2;
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block}
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-off} ${-off} ${lado} ${lado}">
    ${fondo ? (redondo
      ? `<circle cx="12" cy="12" r="${lado / 2}" fill="${FONDO}"/>`
      : `<rect x="${-off}" y="${-off}" width="${lado}" height="${lado}" rx="${lado * 0.22}" fill="${FONDO}"/>`) : ""}
    ${GLIFO}
  </svg>`;
}

/** Ancho y alto de un PNG leyendo su cabecera IHDR (bytes 16-24). Sirve para regenerar los splash
 *  exactamente con las medidas que ya tenían, sin adivinar. */
function medidasPng(f) {
  const b = fs.readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const DENS_ICONO = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const DENS_FRENTE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

const navegador = await chromium.launch();
const pag = await navegador.newPage();
let hechos = 0;

async function pintar(destino, html, w, h) {
  await pag.setViewportSize({ width: w, height: h });
  await pag.setContent(html);
  const png = await pag.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, png);
  hechos++;
  console.log("  ✓ " + path.relative(root, destino));
}

console.log("Iconos de Android desde la marca de la app\n");

for (const [dens, px] of Object.entries(DENS_ICONO)) {
  await pintar(path.join(res, `mipmap-${dens}`, "ic_launcher.png"), pagina({ px, escala: 0.62, fondo: true }), px, px);
  await pintar(path.join(res, `mipmap-${dens}`, "ic_launcher_round.png"), pagina({ px, escala: 0.58, fondo: true, redondo: true }), px, px);
}
for (const [dens, px] of Object.entries(DENS_FRENTE)) {
  // Primer plano del icono adaptativo: SIN fondo (lo pone `ic_launcher_background.xml`) y con el
  // glifo dentro de la zona segura, o el lanzador le corta las esquinas al recortarlo en círculo.
  await pintar(path.join(res, `mipmap-${dens}`, "ic_launcher_foreground.png"), pagina({ px, escala: 0.40, fondo: false }), px, px);
}

// Splash nativo: el que se ve ANTES de que arranque la WebView. Se conservan las medidas de cada
// fichero (son pantallas completas, no cuadrados) y solo se cambia lo que se pinta dentro.
for (const dir of fs.readdirSync(res)) {
  if (!/^drawable(-(land|port)-\w+)?$/.test(dir)) continue;
  const f = path.join(res, dir, "splash.png");
  if (!fs.existsSync(f)) continue;
  const { w, h } = medidasPng(f);
  const lado = Math.round(Math.min(w, h) * 0.26);
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    body{width:${w}px;height:${h}px;background:${FONDO};display:flex;align-items:center;justify-content:center}
  </style><svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 24 24">${GLIFO}</svg>`;
  await pintar(f, html, w, h);
}

await navegador.close();
console.log(`\n${hechos} ficheros. Ahora: npm run apk:prep → assembleRelease (un icono nativo NO viaja por OTA).`);
