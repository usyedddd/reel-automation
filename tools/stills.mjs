#!/usr/bin/env node
// Render several preview stills of one composition with a single bundle
// (much faster than one `npx remotion still` per frame).
//
//   node tools/stills.mjs <composition> <outDir> <frame> [frame ...] [--scale 0.5]
//
// Frames may be given as seconds with an "s" suffix (e.g. 5.3s).
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
let scale = 0.5;
const si = args.indexOf("--scale");
if (si >= 0) {
  scale = Number(args[si + 1]);
  args.splice(si, 2);
}
const [compId, outDir, ...frameArgs] = args;
if (!compId || !outDir || frameArgs.length === 0) {
  console.error("usage: node tools/stills.mjs <composition> <outDir> <frame|Ns> [...] [--scale 0.5]");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: compId });
for (const f of frameArgs) {
  const frame = f.endsWith("s") ? Math.round(parseFloat(f) * composition.fps) : Number(f);
  const output = path.join(outDir, `${compId}-${String(frame).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, scale, timeoutInMilliseconds: 120000 });
  console.log(output);
}
