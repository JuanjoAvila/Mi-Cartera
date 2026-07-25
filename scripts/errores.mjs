#!/usr/bin/env node
/**
 * Lee los últimos eventos de `app_events` (errores del móvil, pings, veredictos de beta) desde la
 * consola, sin abrir la app ni el panel de Supabase.
 *
 * POR QUÉ EXISTE (petición 2026-07-25): cuando algo falla en el móvil del usuario —o en el de su
 * padre o su pareja— la única forma de que quien depura viera el error era que el usuario abriera
 * Actividad, hiciera una captura y la pegara. Eso convierte cada vuelta de diagnóstico en un
 * ping-pong de minutos, y la saga de Trade Republic demostró que lo caro no es arreglar: es VER.
 *
 * LA CLAVE NO VA AL REPO. Se lee de `.env.local` (gitignored por `.env.*`), que se crea a mano:
 *
 *     SUPABASE_SERVICE_ROLE_KEY=<la del panel: Project Settings → API → service_role>
 *
 * Es la llave maestra (se salta RLS), así que: `.env.local` NUNCA se commitea, y este script solo
 * LEE — no hay un solo insert/update/delete aquí, a propósito.
 * Alternativa sin service_role: exportar desde el panel. Pero entonces vuelve el ping-pong.
 *
 * Uso:
 *   node scripts/errores.mjs                    # últimos 30 eventos
 *   node scripts/errores.mjs --limit=100
 *   node scripts/errores.mjs --kind=error       # error | ping | beta
 *   node scripts/errores.mjs --since=2h         # 90m | 2h | 7d
 *   node scripts/errores.mjs --grep=TR          # filtra por texto del mensaje
 *   node scripts/errores.mjs --json             # crudo, para pipes
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Project ref: es público (va en la URL de la app), así que puede vivir en el repo.
const PROJECT_REF = "sfyfjagbnhbplrljpbvh";
const BASE = `https://${PROJECT_REF}.supabase.co`;

/* ---- Config: .env.local > variables de entorno ---- */
function loadEnvLocal() {
  const f = path.join(root, ".env.local");
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error(`
Falta la clave. Crea el fichero  .env.local  en la raíz del repo con UNA línea:

    SUPABASE_SERVICE_ROLE_KEY=<pégala aquí>

La sacas de: Supabase → tu proyecto → Project Settings → API → Project API keys → service_role.
Ese fichero está en .gitignore (.env.*), así que no se sube al repo. NO la pegues en el chat.
`.trim());
  process.exit(1);
}

/* ---- Argumentos ---- */
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const flag = (name) => process.argv.includes(`--${name}`);

const limit = Number(arg("limit", 30)) || 30;
const kind = arg("kind", null);
const grep = arg("grep", null);
const since = arg("since", null);

// "90m" / "2h" / "7d" → ISO. Sin unidad se asumen horas.
function sinceIso(s) {
  const m = String(s).match(/^(\d+)\s*([mhd]?)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const mult = { m: 60e3, h: 3600e3, d: 86400e3 }[(m[2] || "h").toLowerCase()];
  return new Date(Date.now() - n * mult).toISOString();
}

/* ---- Consulta (SOLO LECTURA) ---- */
const qs = new URLSearchParams();
qs.set("select", "created_at,kind,email,app_version,platform,message,detail");
qs.set("order", "created_at.desc");
qs.set("limit", String(limit));
if (kind) qs.set("kind", `eq.${kind}`);
if (grep) qs.set("message", `ilike.*${grep}*`);
if (since) {
  const iso = sinceIso(since);
  if (!iso) { console.error(`--since no entendido: «${since}» (usa 90m, 2h, 7d)`); process.exit(1); }
  qs.set("created_at", `gte.${iso}`);
}

const res = await fetch(`${BASE}/rest/v1/app_events?${qs}`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});

if (!res.ok) {
  // El cuerpo de un 401/403 de PostgREST no lleva la clave, pero por si acaso no se vuelca entero.
  console.error(`Supabase respondió ${res.status} ${res.statusText}`);
  console.error(String(await res.text()).slice(0, 300));
  process.exit(1);
}

const rows = await res.json();
if (flag("json")) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }

if (!rows.length) { console.log("Sin eventos para ese filtro."); process.exit(0); }

// Quién es quién: el email completo es un dato personal y aquí solo hace falta distinguir móviles.
const quien = (e) => (e ? String(e).split("@")[0].slice(0, 12) : "—");
const icono = { error: "✗", ping: "·", beta: "🧪" };

console.log(`${rows.length} evento(s) · más reciente arriba\n`);
for (const r of rows) {
  const t = new Date(r.created_at);
  const fecha = t.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const cab = [icono[r.kind] || "?", fecha, quien(r.email), r.app_version || "?", r.platform || "?"].join("  ");
  console.log(cab);
  console.log("   " + String(r.message || "(sin mensaje)").replace(/\s+/g, " "));
  if (r.detail) {
    const d = String(r.detail).replace(/\s+/g, " ");
    console.log("   ↳ " + (d.length > 400 ? d.slice(0, 400) + "…" : d));
  }
  console.log();
}
