#!/usr/bin/env node
/** Empaqueta @sentry/browser como IIFE global (Sentry) en public/vendor/ */
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const entry = path.join(root, "node_modules", "@sentry", "browser", "build", "npm", "esm", "index.js");
const out = path.join(root, "public", "vendor", "sentry.bundle.min.js");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "Sentry",
  outfile: out,
  minify: true,
  sourcemap: false,
  target: ["es2020"],
});
console.log("✅ vendor/sentry.bundle.min.js");
