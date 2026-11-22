import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { HighlightStroke, sweepP } from "./Highlighter";
import { enterP } from "./motion";
import { KIT, FONT } from "./tokens";
import type { CaptionWord } from "../types";

type Range = { start: number; end: number };

/**
 * "single-word-top" caption: ONE word at a time,
 * top-centre (~13% down), small Montserrat Regular, no pill, no shadow.
 * Numbers arrive pre-grouped from the compiler ("6 billion", "$15 trillion").
 * Each word holds until the next one starts (no flicker in short gaps).
 */
export const KitCaption: React.FC<{
  captions: CaptionWord[];
  hidden?: Range[];
  darkRanges?: Range[];
  top?: number;
}> = ({ captions, hidden = [], darkRanges = [], top = 250 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (hidden.some((h) => t >= h.start && t < h.end)) return null;
  let idx = -1;
  for (let i = 0; i < captions.length; i++) {
    const next = captions[i + 1];
    const holdUntil = next ? Math.min(next.start, captions[i].end + 0.6) : captions[i].end + 0.3;
    if (t >= captions[i].start && t < holdUntil) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const word = captions[idx];
  const dark = darkRanges.some((r) => t >= r.start && t < r.end);
  const p = enterP(frame, fps, word.start, 5);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        textAlign: "center",
        pointerEvents: "none",
        fontFamily: FONT.sans,
        fontWeight: 400,
        fontSize: 42,
        color: dark ? KIT.ink : KIT.white,
        opacity: 0.35 + 0.65 * p,
        filter: p >= 0.999 ? undefined : `blur(${(1 - p) * 4}px)`,
      }}
    >
      {word.text.replace(/^[^\w$%]+|[^\w$%]+$/g, "")}
    </div>
  );
};

type Chunk = { words: CaptionWord[]; start: number; until: number };

const clean = (text: string) => text.replace(/^[^\w$%]+|[^\w$%]+$/g, "");

/**
 * Group words into short caption lines: ≤ maxWords words and ≤ maxChars
 * characters, breaking at punctuation, at pauses and at scene cuts.
 */
const buildChunks = (captions: CaptionWord[], cuts: number[], maxWords = 3, maxChars = 20): Chunk[] => {
  const chunks: { words: CaptionWord[] }[] = [];
  let cur: CaptionWord[] = [];
  const cutBetween = (a: number, b: number) => cuts.some((c) => c > a + 0.01 && c <= b + 0.01);
  for (const w of captions) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + clean(x.text).length + 1, 0) + clean(w.text).length;
    const fits =
      prev &&
      cur.length < maxWords &&
      chars <= maxChars &&
      w.start - prev.end < 0.3 &&
      !/[.,!?;:]$/.test(prev.text) &&
      !cutBetween(prev.start, w.start);
    if (fits) {
      cur.push(w);
    } else {
      if (cur.length) chunks.push({ words: cur });
      cur = [w];
    }
  }
  if (cur.length) chunks.push({ words: cur });
  return chunks.map((c, i) => {
    const start = c.words[0].start;
    const last = c.words[c.words.length - 1];
    const next = chunks[i + 1];
    const nextCut = cuts.find((x) => x > start + 0.01) ?? Infinity;
    const until = Math.min(next ? next.words[0].start : last.end + 0.3, last.end + 0.6, nextCut);
    return { words: c.words, start, until };
  });
};

/**
 * "dynamic" caption (the default): 1–3 word lines, bold
 * Montserrat, words pop in as they're spoken and a highlighter-pen stroke in
 * the reel's marker colour travels word to word (the stroke on the previous
 * word lifts off as the next one sweeps in). Same top band as single-word-top
 * so no scene layout changes.
 */
export const KitDynamicCaption: React.FC<{
  captions: CaptionWord[];
  cuts: number[];
  marker: string;
  hidden?: Range[];
  darkRanges?: Range[];
  top?: number;
}> = ({ captions, cuts, marker, hidden = [], darkRanges = [], top = 214 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = React.useMemo(() => buildChunks(captions, cuts), [captions, cuts]);
  if (hidden.some((h) => t >= h.start && t < h.end)) return null;
  const chunk = chunks.find((c) => t >= c.start - 0.02 && t < c.until);
  if (!chunk) return null;
  // darkRanges = spans where the text is dark ink (light scenes)
  const onDark = !darkRanges.some((r) => t >= r.start && t < r.end);
  const texts = chunk.words.map((w) => clean(w.text));
  const chars = texts.join(" ").length;
  const fontSize = Math.round(Math.min(64, 940 / Math.max(1, chars * 0.64)));
  // index of the word being spoken (the last one that has started)
  let active = -1;
  chunk.words.forEach((w, i) => {
    if (t >= w.start - 0.02) active = i;
  });
  const HAND = 0.16; // seconds for the stroke to hop to the next word
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        flexWrap: "nowrap",
        gap: fontSize * 0.26,
        pointerEvents: "none",
        fontFamily: FONT.sans,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.2,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {chunk.words.map((w, i) => {
        const p = enterP(frame, fps, w.start - 0.03, 6);
        const shown = t >= w.start - 0.03;
        const next = chunk.words[i + 1];
        const head = sweepP(frame, fps, w.start - 0.03, HAND);
        // lifts off as the next word takes the stroke; the last word keeps it
        const tail = next ? sweepP(frame, fps, next.start - 0.03, HAND) : 0;
        const on = i === active || (i === active - 1 && tail < 1);
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              opacity: shown ? p : 0,
              transform: `translateY(${(1 - p) * 10}px) scale(${0.86 + 0.14 * p})`,
              // on a dark stage the marked word turns ink so it reads on the pastel stroke
              color: onDark && i !== active ? KIT.white : KIT.ink,
              textShadow: onDark && i !== active ? "0 2px 14px rgba(0,0,0,0.45)" : undefined,
            }}
          >
            {on && (
              <HighlightStroke
                left={-fontSize * 0.14}
                top={fontSize * 0.2}
                width={`calc(100% + ${fontSize * 0.28}px)`}
                height={fontSize * 0.92}
                color={marker}
                p={head}
                tail={i === active ? 0 : tail}
                multiply={false}
                seed={i + 3}
              />
            )}
            <span style={{ position: "relative" }}>{texts[i]}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Small top-left label, e.g. "Not financial advice". */
export const KitDisclaimer: React.FC<{ text: string; light?: boolean }> = ({ text, light }) => (
  <div
    style={{
      position: "absolute",
      top: 330,
      left: 90,
      fontFamily: FONT.sans,
      fontSize: 24,
      fontWeight: 500,
      color: light ? KIT.mutedInk : KIT.muted,
      pointerEvents: "none",
    }}
  >
    {text}
  </div>
);
