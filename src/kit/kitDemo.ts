import type { BeatSheet } from "../types";

/**
 * Gallery of every scene type, as a dev preview (NOT a reel). Open "kit-demo"
 * in Remotion Studio (`npm run studio`) to see each scene in motion. All names,
 * numbers and images here are placeholders (public/demo/).
 */
export const kitDemo: BeatSheet = {
  id: "kit-demo",
  fps: 30,
  width: 1080,
  height: 1920,
  style: "kit",
  accent: "#8EC5FF",
  captionStyle: "dynamic",
  scenes: [
    {
      type: "statement",
      durationSec: 3,
      lines: [
        { text: "A statement scene builds" },
        { text: "**word by word.**", size: "lg" },
      ],
    },
    {
      type: "stage",
      durationSec: 3.5,
      title: { text: "AI agents", at: 0.1 },
      elements: [
        { kind: "robot", x: 300, y: 800, at: 0.1 },
        { kind: "robot", x: 780, y: 800, at: 0.25 },
        { kind: "robot", x: 300, y: 1150, at: 0.4 },
        { kind: "robot", x: 780, y: 1150, at: 0.55 },
        { kind: "badge", x: 540, y: 975, size: 210, label: "API", at: 0.8, variant: "accent" },
        { kind: "pill", x: 540, y: 1420, label: "1,234 tasks a day", at: 1.2 },
      ],
      links: [
        { from: 0, to: 4, at: 0.9, flow: true },
        { from: 1, to: 4, at: 0.95, flow: true },
        { from: 2, to: 4, at: 1.0, flow: true },
        { from: 3, to: 4, at: 1.05, flow: true },
      ],
    },
    {
      type: "stage",
      durationSec: 3,
      elements: [
        { kind: "person", x: 300, y: 1000, label: "Seller", at: 0.1 },
        { kind: "person", x: 780, y: 1000, label: "You", glow: true, at: 0.25 },
        { kind: "card", x: 540, y: 600, size: 420, label: "Product", sub: "one listing", at: 0.5 },
      ],
      links: [{ from: 0, to: 1, at: 0.6, style: "dotted" }],
      disclaimer: "Not financial advice",
    },
    {
      type: "chart",
      durationSec: 4,
      title: "Example growth curve",
      points: [
        { value: 1, label: "1K", at: 0.6 },
        { value: 6, label: "6K", at: 1.4 },
        { value: 30, label: "30K", at: 2.2 },
        { value: 200, label: "200K", at: 3.0 },
      ],
      brackets: [{ from: -1, to: 1, text: "1 yr", at: 1.5 }],
    },
    {
      type: "bars",
      durationSec: 3,
      bg: "light",
      title: "Time per video",
      bars: [
        { label: "By hand", value: 100, display: "6 h" },
        { label: "Automated", value: 25, display: "1.5 h", accent: true },
      ],
    },
    { type: "number", durationSec: 2.5, bg: "light", value: "40 s", label: "A typical reel", sub: "one topic" },
    { type: "number", durationSec: 2.5, countTo: 12345, suffix: "+", label: "Count-up number", font: "display" },
    {
      type: "stage",
      durationSec: 3,
      bg: "light",
      elements: [
        { kind: "card", x: 540, y: 700, size: 560, label: "Middleman", sub: "takes a cut of every sale", at: 0.1, strikeAt: 1.4 },
        { kind: "badge", x: 330, y: 1150, size: 200, label: "Tool", at: 0.4 },
        { kind: "badge", x: 750, y: 1150, size: 200, label: "You", variant: "brand", at: 0.6 },
      ],
    },
    {
      type: "statement",
      durationSec: 3,
      bg: "black",
      spotlightAt: 0.2,
      lines: [
        { text: "A dark punch beat.", font: "display", size: "lg" },
        { text: "Use one or two per reel.", size: "sm", at: 1.1 },
      ],
    },
    {
      type: "logos",
      durationSec: 3,
      title: "Two brands lock up",
      logos: [{ src: "demo/logo-a.svg", label: "Brand A" }, { src: "demo/logo-b.svg", label: "Brand B" }],
      sub: "real logos, true colours",
    },
    {
      type: "browser",
      durationSec: 4,
      label: "Example article",
      src: "demo/page.svg",
      srcWidth: 2000,
      srcHeight: 1300,
      url: "example.com/news/a-sample-headline",
      focus: { x: 100, y: 120, w: 1800, h: 400 },
      highlights: [
        { x: 1008, y: 205, w: 165, h: 85, at: 0.6 },
        { x: 112, y: 428, w: 450, h: 56, at: 1.6 },
      ],
      credit: "Sample page",
    },
    {
      type: "story",
      durationSec: 4,
      face: "demo/face.svg",
      name: "Alex Example",
      role: "Founder · Example Co",
      logos: ["demo/logo-a.svg"],
      media: "demo/photo.svg",
      mediaAspect: 1.6,
      beats: [
        { text: "Started as a side project", at: 0.6 },
        { text: "No outside funding", at: 1.3 },
        { text: "$1M in sales", at: 2.0, big: true },
      ],
      source: "Sample data",
    },
    { type: "end", durationSec: 2.5, handle: "@yourhandle" },
    { type: "follow", durationSec: 3, handle: "@yourhandle", line: "One short line about your channel." },
    { type: "follow", durationSec: 3, handle: "@yourhandle", mode: "keyword", keyword: "guide" },
  ],
  captions: [
    { start: 3.1, end: 3.6, text: "Agents" },
    { start: 3.6, end: 4.2, text: "coordinate" },
    { start: 6.6, end: 7.2, text: "seller" },
    { start: 9.7, end: 10.5, text: "30K" },
    { start: 13.6, end: 14.2, text: "faster" },
  ],
};
