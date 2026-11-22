import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { bgColor, isLightBg, KIT, type KitBg } from "./tokens";
import { easeInOut } from "./motion";
import type { KitCamera } from "./types";

/**
 * Base for every kit scene: flat stage colour, subtle vignette, and a slow
 * continuous camera move so nothing ever sits still.
 */
export const Stage: React.FC<{
  bg?: KitBg;
  camera?: KitCamera;
  durationSec: number;
  spotlightAt?: number;
  children: React.ReactNode;
}> = ({ bg, camera = "push", durationSec, spotlightAt, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(1, Math.round(durationSec * fps));
  const k = interpolate(frame, [0, total], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const transform =
    camera === "none"
      ? undefined
      : camera === "push"
        ? `scale(${1 + 0.06 * k})`
        : camera === "pull"
          ? `scale(${1.07 - 0.06 * k})`
          : camera === "panLeft"
            ? `scale(1.05) translateX(${30 - 60 * k}px)`
            : camera === "panRight"
              ? `scale(1.05) translateX(${-30 + 60 * k}px)`
              : `scale(1.04) translateY(${40 - 80 * k}px)`;
  const light = isLightBg(bg);
  const spot =
    spotlightAt === undefined
      ? 0
      : interpolate(frame, [spotlightAt * fps, spotlightAt * fps + 10, spotlightAt * fps + 40], [0, 1, 0.35], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return (
    <AbsoluteFill
      style={{
        // light stage: soft studio sweep (brighter centre) instead of a flat grey
        background: light
          ? "radial-gradient(130% 85% at 50% 38%, #FBFBFB 0%, #F0F0F1 55%, #E3E4E6 100%)"
          : bgColor(bg),
        overflow: "hidden",
      }}
    >
      <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>
      {spot > 0 && (
        <AbsoluteFill
          style={{
            background: light
            ? `radial-gradient(60% 35% at 50% 0%, rgba(255,255,255,${0.9 * spot}) 0%, transparent 70%)`
            : `radial-gradient(60% 35% at 50% 0%, rgba(255,255,255,${0.55 * spot}) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background: light
            ? "radial-gradient(120% 80% at 50% 45%, transparent 60%, rgba(0,0,0,0.06) 100%)"
            : `radial-gradient(120% 80% at 50% 45%, transparent 55%, ${KIT.bgBlack}aa 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
