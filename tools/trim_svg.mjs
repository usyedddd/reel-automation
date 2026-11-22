#!/usr/bin/env node
/**
 * trim_svg.mjs — tighten an SVG logo's viewBox to the drawn content, so
 * wordmarks shipped in square boxes (some Simple Icons wordmarks) render at
 * full size inside logo chips. Rewrites the files in place.
 *
 * Usage: node tools/trim_svg.mjs public/assets/logos/*.svg   (or a dir)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

let files = process.argv.slice(2);
if (files.length === 1 && fs.existsSync(files[0]) && fs.statSync(files[0]).isDirectory()) {
  files = fs.readdirSync(files[0]).filter((f) => f.endsWith(".svg")).map((f) => path.join(process.argv[2], f));
}
if (!files.length) {
  console.error("usage: node tools/trim_svg.mjs <file.svg ...|dir>");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const f of files) {
  const svg = fs.readFileSync(f, "utf8");
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const box = await page.evaluate(() => {
    const el = document.querySelector("svg");
    if (!el) return null;
    const b = el.getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  if (!box || box.w <= 0 || box.h <= 0) {
    console.log(`skip ${path.basename(f)} (no bbox)`);
    continue;
  }
  const pad = Math.max(box.w, box.h) * 0.02;
  const vb = `${+(box.x - pad).toFixed(3)} ${+(box.y - pad).toFixed(3)} ${+(box.w + 2 * pad).toFixed(3)} ${+(box.h + 2 * pad).toFixed(3)}`;
  let out = svg.replace(/\sviewBox="[^"]*"/, ` viewBox="${vb}"`);
  if (!/\sviewBox=/.test(out)) out = out.replace("<svg", `<svg viewBox="${vb}"`);
  // drop fixed width/height so the chip controls the size
  out = out.replace(/(<svg[^>]*?)\s(width|height)="[^"]*"/g, "$1").replace(/(<svg[^>]*?)\s(width|height)="[^"]*"/g, "$1");
  fs.writeFileSync(f, out);
  console.log(`${path.basename(f)}: viewBox -> ${vb} (aspect ${(box.w / box.h).toFixed(2)})`);
}
await browser.close();
