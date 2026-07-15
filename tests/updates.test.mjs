#!/usr/bin/env node
import assert from "node:assert/strict";

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
