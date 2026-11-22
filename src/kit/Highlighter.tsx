import React from "react";
import { Easing, interpolate } from "remotion";

/**
 * Highlighter-pen strokes: highlights look like a marker on a printed page,
 * not an outlined box.
 * A translucent ink band with a soft wet leading edge sweeps left → right.
 */

// slow start, long gentle settle: reads like a hand drawing the marker
const PEN = Easing.bezier(0.45, 0, 0.15, 1);

/** 0→1 progress of a pen stroke that starts at `atSec` and lasts `durSec`. */
export const sweepP = (frame: number, fps: number, atSec: number, durSec = 0.4): number =>
  interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: PEN,
  });

/** Stroke length → duration: short words snap, long phrases take a beat longer. */
export const strokeDur = (widthPx: number): number =>
  Math.min(0.7, Math.max(0.3, 0.24 + widthPx / 1800));

const rgba = (hex: string, a: number): string => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const HighlightStroke: React.FC<{
  left: number;
  top: number;
  width: number | string;
  height: number;
  color: string;
  /** head of the stroke, 0→1 (sweeps in) */
  p: number;
  /** tail of the stroke, 0→1 (lifts off left → right, used for hand-offs) */
  tail?: number;
  /** multiply over a screenshot so the printed text stays crisp */
  multiply?: boolean;
  /** varies the tilt / nib shape per stroke */
  seed?: number;
  style?: React.CSSProperties;
}> = ({ left, top, width, height, color, p, tail = 0, multiply = true, seed = 0, style }) => {
  if (p <= 0 || tail >= 1) return null;
  const feather = 12; // % of the width: the soft, still-wet edge
  const head = p * (100 + feather);
  const back = tail * (100 + feather);
  const mask =
    p >= 0.999 && tail <= 0
      ? undefined
      : `linear-gradient(90deg, transparent ${back - feather}%, #000 ${back}%, #000 ${head - feather}%, transparent ${head}%)`;
  const tilt = (((seed * 37) % 7) - 3) * 0.16; // ±0.5°, never perfectly level
  const r = height;
  // chisel tip: both ends cut on a slant, the way a marker nib leaves them
  const k = Math.min(12, height * 0.16);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        // ink pools slightly at the top and bottom edge of a real marker
        background: `linear-gradient(180deg, ${rgba(color, 0.82)} 0%, ${rgba(color, 0.96)} 22%, ${rgba(color, 0.96)} 78%, ${rgba(color, 0.84)} 100%)`,
        borderRadius: `${r * 0.08}px ${r * 0.14}px ${r * 0.1}px ${r * 0.16}px`,
        clipPath: `polygon(${k}px 0, 100% 0, calc(100% - ${k}px) 100%, 0 100%)`,
        mixBlendMode: multiply ? "multiply" : undefined,
        transform: `rotate(${tilt}deg)`,
        WebkitMaskImage: mask,
        maskImage: mask,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};
