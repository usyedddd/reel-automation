#!/usr/bin/env node
/**
 * Fetch an official brand logo SVG and extract its paths.
 *
 * Sources, in order:
 *   1. svgl.app (full-colour official SVGs) — only if the match title actually
 *      contains the requested name (svgl's fuzzy search returns wrong brands,
 *      e.g. "sap" -> WhatsApp).
 *   2. Simple Icons (official glyph + official brand hex) as the fallback.
 * Logos keep their TRUE brand colours (including orange
 * ones like Claude).
 *
 * Writes:
 *   public/assets/logos/<name>.svg
 *   public/assets/logos/<name>.paths.json  ({ viewBox, paths: [{d, fill}], source, title })
 *
 * Usage: node tools/get_logo.mjs <name> [--query <search>] [--index 0]
 *                                [--source svgl|simple-icons] [--slug <simple-icons slug>]
 */
import fs from "node:fs";
import path from "node:path";

const SIMPLE_ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@13.21.0";

const args = process.argv.slice(2);
const name = args[0];
if (!name) {
  console.error("usage: node tools/get_logo.mjs <name> [--query q] [--index n] [--source svgl|simple-icons] [--slug s]");
  process.exit(1);
}
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const q = opt("--query") ?? name;
const idx = Number(opt("--index") ?? 0);
const source = opt("--source");
const slug = (opt("--slug") ?? name).toLowerCase().replace(/[^a-z0-9]/g, "");

const dir = path.join(import.meta.dirname, "..", "public", "assets", "logos");
fs.mkdirSync(dir, { recursive: true });

async function fromSvgl() {
  const res = await fetch(`https://api.svgl.app?search=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const hits = await res.json();
  if (!Array.isArray(hits) || !hits.length) return null;
  console.log("svgl matches:", hits.map((h, i) => `${i}:${h.title}`).slice(0, 6).join("  "));
  const hit = hits[idx];
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  // whole-word / prefix match only ("sap" must not match "WhatsApp")
  const words = hit.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const ok = norm(hit.title) === norm(q) || norm(hit.title).startsWith(norm(q)) || words.includes(norm(q));
  if (!ok && !opt("--index")) {
    console.log(`svgl best match "${hit.title}" does not match "${q}" — skipping`);
    return null;
  }
  const route = typeof hit.route === "string" ? hit.route : hit.route.light;
  return { svg: await (await fetch(route)).text(), source: route, title: hit.title };
}

async function fromSimpleIcons() {
  const res = await fetch(`${SIMPLE_ICONS}/icons/${slug}.svg`);
  if (!res.ok) return null;
  let svg = await res.text();
  const data = await (await fetch(`${SIMPLE_ICONS}/_data/simple-icons.json`)).json();
  const icons = Array.isArray(data) ? data : data.icons;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const meta = icons.find((i) => (i.slug ?? norm(i.title)) === slug) ?? icons.find((i) => norm(i.title) === slug);
  const hex = meta?.hex ? `#${meta.hex}` : "#000000";
  svg = svg.replace("<svg ", `<svg fill="${hex}" `);
  return { svg, source: `${SIMPLE_ICONS}/icons/${slug}.svg`, title: meta?.title ?? name };
}

let got = null;
if (source !== "simple-icons") got = await fromSvgl().catch(() => null);
if (!got && source !== "svgl") got = await fromSimpleIcons().catch(() => null);
if (!got) {
  console.error(`no logo found for "${name}" — capture it from the brand's website instead (tools/capture.mjs --selector)`);
  process.exit(2);
}

const { svg, source: src, title } = got;
const svgPath = path.join(dir, `${name}.svg`);
fs.writeFileSync(svgPath, svg);

// --- extract viewBox + paths (covers typical brand SVGs) ---
const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] ?? "0 0 24 24";
const rootFill = (svg.match(/<svg[^>]*fill="([^"]+)"/) || [])[1];
const paths = [];
const re = /<path\b[^>]*>/g;
let m;
while ((m = re.exec(svg))) {
  const tag = m[0];
  const d = (tag.match(/\sd="([^"]+)"/) || [])[1];
  if (!d) continue;
  const fill = (tag.match(/fill="([^"]+)"/) || [])[1] ?? rootFill ?? "currentColor";
  if (fill === "none") continue;
  paths.push({ d, fill });
}
fs.writeFileSync(path.join(dir, `${name}.paths.json`), JSON.stringify({ viewBox, paths, source: src, title }, null, 2));
console.log(`saved ${svgPath}  (${title} · ${src.startsWith(SIMPLE_ICONS) ? "simple-icons" : "svgl"})`);
