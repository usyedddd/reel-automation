import type React from "react";
import { Easing, interpolate, spring } from "remotion";

/** 0→1 entrance progress starting at `atSec` (soft spring, no overshoot). */
export const enterP = (frame: number, fps: number, atSec = 0, frames = 14): number =>
  spring({
    frame: frame - Math.round(atSec * fps),
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.6 },
    durationInFrames: frames,
  });

/** 1→0 exit progress starting at `outSec` (returns 1 when no exit). */
export const exitP = (frame: number, fps: number, outSec?: number, frames = 10): number =>
  outSec === undefined
    ? 1
    : interpolate(frame, [Math.round(outSec * fps), Math.round(outSec * fps) + frames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      });

/** The house entrance: fade + de-blur + slight rise/scale. */
export const blurIn = (p: number, rise = 18, blur = 14): React.CSSProperties => ({
  opacity: p,
  filter: p >= 0.999 ? undefined : `blur(${(1 - p) * blur}px)`,
  transform: `translateY(${(1 - p) * rise}px) scale(${0.96 + 0.04 * p})`,
});

/** Gentle idle float so objects never sit dead still. */
export const floatY = (frame: number, fps: number, seed = 0, amp = 6): number =>
  Math.sin((frame / fps) * 1.3 + seed * 1.7) * amp;

/** Linear 0..1 over the whole scene. */
export const sceneT = (frame: number, totalFrames: number): number =>
  Math.min(1, Math.max(0, frame / Math.max(1, totalFrames)));

export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
