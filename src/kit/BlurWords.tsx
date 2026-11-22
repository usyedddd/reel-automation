import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, enterP } from "./motion";
import { KIT, FONT } from "./tokens";
import type { KitLine } from "./types";

const SIZE: Record<NonNullable<KitLine["size"]>, number> = {
  xs: 30,
  sm: 40,
  md: 54,
  lg: 76,
  xl: 132,
};

/** Split "plain **bold** plain" into words, keeping the bold flag. */
const tokens = (text: string): { w: string; bold: boolean }[] => {
  const out: { w: string; bold: boolean }[] = [];
  text.split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    const clean = bold ? part.slice(2, -2) : part;
    clean
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => out.push({ w, bold }));
  });
  return out;
};

/**
 * Word-by-word blur-in text block.
 * Each word de-blurs + rises into place; lines follow each other unless they
 * carry their own `at`.
 */
export const BlurWords: React.FC<{
  lines: KitLine[];
  light?: boolean;
  accent: string;
  align?: "center" | "left";
  width?: number;
}> = ({ lines, light = false, accent, align = "center", width = 900 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let clock = 0.05;
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: 10,
      }}
    >
      {lines.map((line, li) => {
        const words = tokens(line.text);
        const stagger = line.stagger ?? 0.11;
        const start = line.at ?? clock;
        clock = start + words.length * stagger + 0.15;
        const font = line.font ?? "sans";
        const size = SIZE[line.size ?? (font === "display" ? "lg" : "md")];
        const base = line.accent ? accent : light ? KIT.ink : KIT.white;
        return (
          <div
            key={li}
            style={{
              // block + balanced wrapping: no single-word widows
              width: "100%",
              textAlign: align === "center" ? "center" : "left",
              textWrap: "balance",
              lineHeight: font === "display" ? 1.0 : 1.18,
            } as React.CSSProperties}
          >
            {words.map((tok, wi) => {
              const p = enterP(frame, fps, start + wi * stagger, 12);
              const gap = font === "display" ? size * 0.2 : size * 0.26;
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    marginRight: wi < words.length - 1 ? gap : 0,
                    fontFamily: FONT[font],
                    fontWeight: font === "display" ? 400 : tok.bold ? 700 : 400,
                    fontSize: size,
                    letterSpacing: font === "display" ? "-0.01em" : "0",
                    color: base,
                    ...blurIn(p, 16, 14),
                    opacity: p * (line.muted ? 0.6 : 1),
                  }}
                >
                  {tok.w}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
