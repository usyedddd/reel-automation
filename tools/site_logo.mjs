#!/usr/bin/env node
/**
 * site_logo.mjs — save a brand's real logo straight from its own website
 * (for brands that svgl / Simple Icons don't carry).
 *
 * Finds the first <svg> or <img> inside the home link of the page header and
 * writes it as public/assets/logos/<name>.svg (inline SVG, inherited colours
 * resolved) or .png (img, downloaded at 3x).
 *
 * Usage: node tools/site_logo.mjs <name> <url> [--selector css]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [, , name, url, ...rest] = process.argv;
if (!name || !url) {
  console.error("usage: node tools/site_logo.mjs <name> <url> [--selector css]");
  process.exit(1);
}
const selector = rest.includes("--selector") ? rest[rest.indexOf("--selector") + 1] : null;
const dir = path.join(import.meta.dirname, "..", "public", "assets", "logos");
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3, colorScheme: "light" });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);

const found = await page.evaluate((sel) => {
  const candidates = sel
    ? [document.querySelector(sel)]
    : [
        ...document.querySelectorAll('header a[href="/"], nav a[href="/"], a[href="/"], a[aria-label*="home" i], header a, nav a'),
      ];
  for (const el of candidates) {
    if (!el) continue;
    const svg = el.tagName === "svg" ? el : el.querySelector("svg");
    if (svg) {
      const r = svg.getBoundingClientRect();
      if (r.width < 20 || r.height < 8) continue;
      // inline computed colours so currentColor / CSS fills survive outside the page
      const clone = svg.cloneNode(true);
      const src = [svg, ...svg.querySelectorAll("*")];
      const dst = [clone, ...clone.querySelectorAll("*")];
      src.forEach((node, i) => {
        const cs = getComputedStyle(node);
        const d = dst[i];
        if (cs.fill && cs.fill !== "none" && !d.getAttribute("fill")) d.setAttribute("fill", cs.fill);
        if (cs.stroke && cs.stroke !== "none" && !d.getAttribute("stroke")) d.setAttribute("stroke", cs.stroke);
        if (d.getAttribute("fill") === "currentColor") d.setAttribute("fill", cs.color);
      });
      if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.removeAttribute("class");
      clone.removeAttribute("style");
      return { kind: "svg", markup: clone.outerHTML, w: r.width, h: r.height };
    }
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (img) {
      const r = img.getBoundingClientRect();
      if (r.width < 20) continue;
      return { kind: "img", x: r.x, y: r.y, w: r.width, h: r.height, src: img.currentSrc || img.src };
    }
  }
  return null;
}, selector);

if (!found) {
  await browser.close();
  console.error("no logo found — pass --selector");
  process.exit(2);
}
let out;
if (found.kind === "svg") {
  out = path.join(dir, `${name}.svg`);
  fs.writeFileSync(out, found.markup);
} else {
  out = path.join(dir, `${name}.png`);
  await page.screenshot({ path: out, clip: { x: found.x, y: found.y, width: found.w, height: found.h }, omitBackground: true });
}
await browser.close();
console.log(`saved ${out}  (${found.kind}, ${Math.round(found.w)}x${Math.round(found.h)} css px, from ${url})`);
