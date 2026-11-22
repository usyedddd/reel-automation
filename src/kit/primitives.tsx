import React from "react";
import { Img, staticFile } from "remotion";
import { KIT, FONT, textOn } from "./tokens";

/**
 * Figure kit: soft chrome / glass objects lit from above.
 * Everything is sized by a single `size` (px width) so stage layouts stay
 * simple. Colours come from KIT + the reel accent only.
 */

let uid = 0;
const useId = (prefix: string) => React.useMemo(() => `${prefix}-${++uid}`, [prefix]);

/** Rounded chrome cube head with dash eyes — the AI-agent hero character. */
export const Robot: React.FC<{
  size: number;
  accent: string;
  glow?: boolean;
  /** 0..1 eye-blink amount */
  blink?: number;
}> = ({ size, accent, glow = true, blink = 0 }) => {
  const id = useId("robot");
  const eyeH = 4.6 * (1 - 0.85 * blink);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F5F7" />
          <stop offset="0.35" stopColor="#B9BCC2" />
          <stop offset="0.75" stopColor="#5A5D63" />
          <stop offset="1" stopColor="#2A2B2E" />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor={accent} stopOpacity="0" />
          <stop offset="1" stopColor={accent} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.8" r="0.6">
          <stop offset="0" stopColor={accent} stopOpacity="0.45" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <ellipse cx="50" cy="86" rx="58" ry="26" fill={`url(#${id}-halo)`} />}
      <rect x="42" y="6" width="16" height="8" rx="3" fill="#2E3034" />
      <rect x="8" y="12" width="84" height="78" rx="17" fill={`url(#${id}-chrome)`} />
      {glow && <rect x="8" y="12" width="84" height="78" rx="17" fill={`url(#${id}-glow)`} />}
      <rect x="9.5" y="13.5" width="81" height="20" rx="14" fill="#FFFFFF" opacity="0.28" />
      <rect x="18" y="36" width="64" height="32" rx="9" fill="#0A0A0B" opacity="0.42" />
      <rect x="29" y={51 - eyeH / 2} width="15" height={eyeH} rx="2.2" fill="#FFFFFF" />
      <rect x="56" y={51 - eyeH / 2} width="15" height={eyeH} rx="2.2" fill="#FFFFFF" />
    </svg>
  );
};

/** Faceless person: chrome sphere head on a big half-sphere body. */
export const SpherePerson: React.FC<{
  size: number;
  accent: string;
  /** rim-light the body in the accent ("you" in a scene) */
  glow?: boolean;
  /** "neutral" | "sad" mouth */
  mood?: "neutral" | "sad" | "none";
  light?: boolean;
}> = ({ size, accent, glow = false, mood = "neutral", light = false }) => {
  const id = useId("person");
  const h = size * 0.95;
  return (
    <svg width={size} height={h} viewBox="0 0 100 95" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}-head`} cx="0.38" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor={light ? "#C9CCD1" : "#9C9FA5"} />
          <stop offset="1" stopColor={light ? "#7D8086" : "#232427"} />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor={light ? "#FFFFFF" : "#D9DBDF"} />
          <stop offset="0.5" stopColor={light ? "#CFD1D5" : "#3A3B3F"} />
          <stop offset="1" stopColor={light ? "#ECECEC" : "#0F0F0F"} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="0.6" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M 4 95 A 46 46 0 0 1 96 95 Z" fill={`url(#${id}-body)`} />
      {glow && <path d="M 4 95 A 46 46 0 0 1 96 95" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="2.4" />}
      <circle cx="50" cy="30" r="19" fill={`url(#${id}-head)`} />
      {mood !== "none" && (
        <>
          <circle cx="44" cy="30" r="1.5" fill={light ? "#111" : "#0A0A0A"} />
          <circle cx="56" cy="30" r="1.5" fill={light ? "#111" : "#0A0A0A"} />
          <path
            d={mood === "sad" ? "M 46 39 Q 50 36 54 39" : "M 47 37.5 L 53 37.5"}
            stroke={light ? "#111" : "#0A0A0A"}
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};

/** Glass card: portrait/logo + name + subtitle (+ value line under it). */
export const GlassCard: React.FC<{
  width: number;
  title?: string;
  sub?: string;
  value?: string;
  src?: string;
  /** render the image in black & white (default true for portraits) */
  bw?: boolean;
  light?: boolean;
  accent: string;
  highlight?: boolean;
}> = ({ width, title, sub, value, src, bw = true, light = false, accent, highlight }) => {
  const pad = width * 0.07;
  const img = width * 0.32;
  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: width * 0.04 }}>
      <div
        style={{
          width,
          boxSizing: "border-box",
          padding: pad,
          borderRadius: width * 0.09,
          display: "flex",
          alignItems: "center",
          gap: pad,
          position: "relative",
          overflow: "hidden",
          background: light
            ? "linear-gradient(135deg, #FFFFFF 0%, #F1F1F3 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
          border: `1.5px solid ${highlight ? accent : light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.32)"}`,
          boxShadow: light
            ? "0 24px 60px rgba(0,0,0,0.12)"
            : `0 30px 80px rgba(0,0,0,0.75)${highlight ? `, 0 0 40px ${accent}55` : ""}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(120% 90% at 85% 15%, ${accent}${light ? "22" : "40"} 0%, transparent 55%)`,
          }}
        />
        {src && (
          <Img
            src={/^https?:/.test(src) ? src : staticFile(src)}
            style={{
              width: img,
              height: img,
              objectFit: "cover",
              borderRadius: img * 0.18,
              filter: bw ? "grayscale(1) contrast(1.08)" : undefined,
              position: "relative",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: width * 0.012 }}>
          {title && (
            <div
              style={{
                fontFamily: FONT.sans,
                fontWeight: 600,
                fontSize: width * 0.085,
                color: light ? KIT.ink : KIT.white,
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
          )}
          {sub && (
            <div
              style={{
                fontFamily: FONT.sans,
                fontWeight: 400,
                fontSize: width * 0.042,
                color: light ? KIT.mutedInk : KIT.muted,
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
      {value && (
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: width * 0.065,
            color: light ? KIT.ink : KIT.white,
            paddingLeft: pad * 0.4,
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
};

/** Chrome-ring coin/badge with a label inside. `brand` = solid black disc. */
export const Badge: React.FC<{
  size: number;
  label: string;
  accent: string;
  variant?: "chrome" | "brand" | "accent";
  light?: boolean;
}> = ({ size, label, accent, variant = "chrome", light = false }) => {
  const ring = size * 0.075;
  const inner =
    variant === "brand"
      ? "#000000"
      : variant === "accent"
        ? `radial-gradient(circle at 35% 30%, ${accent} 0%, ${accent}cc 45%, #0F0F0F 120%)`
        : light
          ? "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #DADCE0 70%)"
          : "radial-gradient(circle at 35% 30%, #2A2B2E 0%, #0B0B0C 75%)";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        padding: ring,
        boxSizing: "border-box",
        background:
          variant === "brand"
            ? "linear-gradient(160deg, #FFFFFF, #8D9096 50%, #FFFFFF)"
            : "conic-gradient(from 200deg, #FFFFFF, #6E7076, #F5F6F8, #3A3B3F, #FFFFFF)",
        boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,${light ? 0.18 : 0.7}), 0 0 ${size * 0.3}px ${accent}${variant === "accent" ? "66" : "22"}`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: inner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: FONT.sans,
          fontWeight: variant === "brand" ? 700 : 500,
          fontSize: label.length <= 3 ? size * 0.32 : size * Math.max(0.075, 0.5 / Math.max(6, label.length)),
          letterSpacing: variant === "brand" ? "-0.02em" : "0",
          color: light && variant === "chrome" ? KIT.ink : KIT.white,
          padding: size * 0.08,
          boxSizing: "border-box",
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** Glossy capsule tag ("● Brokerage", "● $683,336,078"). */
export const Pill: React.FC<{
  label: string;
  height: number;
  accent: string;
  dot?: boolean;
  variant?: "glass" | "white" | "accent";
}> = ({ label, height, accent, dot = true, variant = "white" }) => (
  <div
    style={{
      height,
      display: "inline-flex",
      alignItems: "center",
      gap: height * 0.3,
      padding: `0 ${height * 0.55}px`,
      borderRadius: height,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: height * 0.42,
      whiteSpace: "nowrap",
      color: variant === "white" ? KIT.ink : variant === "accent" ? textOn(accent) : KIT.white,
      background:
        variant === "white"
          ? "linear-gradient(180deg, #FFFFFF 0%, #DDDFE3 100%)"
          : variant === "accent"
            ? `linear-gradient(180deg, ${accent} 0%, ${accent}99 100%)`
            : "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)",
      border: variant === "glass" ? "1.5px solid rgba(255,255,255,0.3)" : "none",
      boxShadow: `0 ${height * 0.2}px ${height * 0.6}px rgba(0,0,0,0.35)`,
    }}
  >
    {dot && (
      <span
        style={{
          width: height * 0.22,
          height: height * 0.22,
          borderRadius: "50%",
          background: variant === "white" ? KIT.ink : accent,
          boxShadow: variant === "white" ? undefined : `0 0 ${height * 0.3}px ${accent}`,
        }}
      />
    )}
    {label}
  </div>
);

/** macOS-style pointer, white with dark outline. */
export const Cursor: React.FC<{ size: number; pressed?: boolean }> = ({ size, pressed }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ transform: `scale(${pressed ? 0.86 : 1})`, transformOrigin: "10% 10%", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
  >
    <path d="M3 2 L3 19 L7.5 14.8 L10.6 21.6 L13.6 20.3 L10.6 13.6 L16.8 13.6 Z" fill="#FFFFFF" stroke="#0F0F0F" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

/** Dotted audio waveform, animated (brand sign-off). */
export const Waveform: React.FC<{ width: number; frame: number; fps: number; color?: string; level?: number }> = ({
  width,
  frame,
  fps,
  color = KIT.white,
  level = 1,
}) => {
  const n = 64;
  const gap = width / n;
  const t = frame / fps;
  return (
    <div style={{ width, height: 40, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {Array.from({ length: n }).map((_, i) => {
        const center = 1 - Math.abs(i - n / 2) / (n / 2);
        const wobble =
          0.5 + 0.5 * Math.sin(t * 9 + i * 0.9) * Math.sin(t * 3.1 + i * 0.37) + 0.2 * Math.sin(t * 17 + i * 2.3);
        const hgt = 4 + 30 * level * Math.max(0, wobble) * (0.25 + 0.75 * center);
        return (
          <span
            key={i}
            style={{ width: Math.max(2, gap * 0.45), height: hgt, borderRadius: 4, background: color, opacity: 0.92 }}
          />
        );
      })}
    </div>
  );
};

/** Radial floor glow under a stage (white or accent). */
export const FloorGlow: React.FC<{ color: string; y?: number; strength?: number }> = ({ color, y = 1500, strength = 0.35 }) => (
  <div
    style={{
      position: "absolute",
      left: -200,
      right: -200,
      top: y - 380,
      height: 760,
      background: `radial-gradient(50% 50% at 50% 50%, ${color}${Math.round(strength * 255)
        .toString(16)
        .padStart(2, "0")} 0%, transparent 70%)`,
      pointerEvents: "none",
    }}
  />
);

/**
 * Big red ban/X stamp centred on its parent. Height follows the parent; the
 * width is capped at 1.3x the height so wide pills/cards get a bold X, not a
 * squashed one.
 */
export const StrikeX: React.FC<{ p: number; stroke?: number }> = ({ p, stroke = 12 }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      top: "-14%",
      height: "128%",
      aspectRatio: "1.3",
      maxWidth: "112%",
      left: "50%",
      transform: "translateX(-50%)",
      opacity: p,
      overflow: "visible",
    }}
  >
    <path
      d="M 12 12 L 88 88 M 88 12 L 12 88"
      stroke={KIT.negative}
      strokeWidth={stroke}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      fill="none"
      pathLength={100}
      strokeDasharray="100"
      strokeDashoffset={100 * (1 - p)}
      style={{ filter: "drop-shadow(0 0 10px rgba(138,28,36,0.6))" }}
    />
  </svg>
);
