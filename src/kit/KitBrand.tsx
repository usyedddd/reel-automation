import React from "react";
import { Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../theme/tokens";
import { Stage } from "./Stage";
import { blurIn, easeOut, enterP, floatY } from "./motion";
import { FloorGlow } from "./primitives";
import { KIT, FONT, accentInk, isLightBg } from "./tokens";
import type { KitLogosProps, KitStoryProps } from "./types";

type Timed = { durationSec: number };
const file = (src: string) => (/^https?:/.test(src) ? src : staticFile(src));

/**
 * White rounded chip that holds a REAL brand logo in its true colours
 * (never recoloured). The chip keeps any logo readable on any stage.
 */
export const LogoChip: React.FC<{ src: string; size: number; label?: string; light: boolean }> = ({
  src,
  size,
  label,
  light,
}) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    <div
      style={{
        // grows sideways for wide wordmarks so they stay big
        minWidth: size,
        height: size,
        boxSizing: "border-box",
        padding: `0 ${size * 0.16}px`,
        borderRadius: size * 0.24,
        background: "#FFFFFF",
        boxShadow: light
          ? "0 26px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)"
          : "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Img src={file(src)} style={{ height: size * 0.42, width: "auto", maxWidth: size * 1.2, objectFit: "contain" }} />
    </div>
    {label && (
      <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: Math.max(28, size * 0.12), color: light ? KIT.ink : KIT.white }}>
        {label}
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* logos — real logos locking up: "Brand A × Brand B"                  */
/* ------------------------------------------------------------------ */

export const KitLogos: React.FC<KitLogosProps & Timed> = ({
  bg,
  logos,
  joiner = "×",
  title,
  sub,
  at = 0.05,
  bgSrc,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const n = Math.max(1, Math.min(3, logos.length));
  const size = n === 1 ? 360 : n === 2 ? 300 : 230;
  const gap = n === 3 ? 30 : 50;
  const joinerW = n === 1 ? 0 : 80;
  const pulse = interpolate(frame, [(at + 0.45) * fps, (at + 0.75) * fps, (at + 1.3) * fps], [0, 1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Stage bg={bg} camera="push" durationSec={durationSec}>
      {bgSrc && (
        <Img
          src={file(bgSrc)}
          style={{
            position: "absolute",
            left: -60,
            top: 200,
            width: 1200,
            opacity: 0.09,
            filter: "blur(8px) grayscale(0.4)",
          }}
        />
      )}
      <FloorGlow color={theme.accent} y={1000} strength={0.12 + 0.18 * pulse} />
      {title && (
        <div
          style={{
            position: "absolute",
            top: 640,
            left: 60,
            right: 60,
            textAlign: "center",
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: 50,
            color: light ? KIT.ink : KIT.white,
            ...blurIn(enterP(frame, fps, Math.max(0, at - 0.05))),
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 960 - size / 2,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap,
        }}
      >
        {logos.slice(0, 3).map((logo, i) => {
          const landAt = logo.at ?? at + i * 0.14;
          const p = spring({
            frame: frame - Math.round(landAt * fps),
            fps,
            config: { damping: 15, stiffness: 140, mass: 0.7 },
          });
          const fromX = (i - (n - 1) / 2) * 260;
          // the joiner arrives just before the logo it introduces
          const jp = enterP(frame, fps, logo.at !== undefined ? Math.max(0, logo.at - 0.12) : at + 0.32, 10);
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  style={{
                    width: joinerW,
                    height: size,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.sans,
                    fontWeight: 300,
                    fontSize: 110,
                    lineHeight: 1,
                    color: accentInk(theme.accent, light),
                    opacity: jp,
                    transform: `scale(${0.4 + 0.6 * jp}) rotate(${(1 - jp) * -90}deg)`,
                  }}
                >
                  {joiner}
                </div>
              )}
              <div
                style={{
                  opacity: Math.min(1, p * 1.4),
                  filter: p > 0.98 ? undefined : `blur(${(1 - p) * 12}px)`,
                  transform: `translate(${fromX * (1 - p)}px, ${floatY(frame, fps, i, 5)}px) scale(${0.7 + 0.3 * p})`,
                }}
              >
                <LogoChip src={logo.src} size={size} label={logo.label} light={light} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {sub && (
        <div
          style={{
            position: "absolute",
            top: 960 + size / 2 + (logos.some((l) => l.label) ? 120 : 70),
            left: 80,
            right: 80,
            textAlign: "center",
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 40,
            color: light ? KIT.mutedInk : KIT.muted,
            ...blurIn(enterP(frame, fps, at + 0.6)),
          }}
        >
          {sub}
        </div>
      )}
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* story — a real person's story: face, name, beats, payoff          */
/* ------------------------------------------------------------------ */

export const KitStory: React.FC<KitStoryProps & Timed> = ({
  bg,
  face,
  name,
  role,
  media,
  mediaAspect = 4 / 3,
  mediaTag,
  beats,
  logos = [],
  source,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const ink = light ? KIT.ink : KIT.white;
  const muted = light ? KIT.mutedInk : KIT.muted;
  const W = 940;
  const cardP = enterP(frame, fps, 0, 14);
  const mediaH = media ? Math.min(680, (W - 60) / mediaAspect) : 0;
  const total = Math.max(1, Math.round(durationSec * fps));
  const kb = interpolate(frame, [0, total], [1.04, 1.14], { extrapolateRight: "clamp" }); // Ken Burns on the still
  return (
    <Stage bg={bg} camera="push" durationSec={durationSec}>
      {/* card is vertically centred between the top caption and Instagram's bottom UI */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 320,
          bottom: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
      <div
        style={{
          position: "relative",
          width: W,
          boxSizing: "border-box",
          padding: 30,
          borderRadius: 40,
          background: light ? "#FFFFFF" : "#18191B",
          boxShadow: light ? "0 40px 90px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)" : "0 40px 110px rgba(0,0,0,0.8)",
          ...blurIn(cardP, 40, 14),
        }}
      >
        {/* header: face + name + role + brand logos */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {face && (
            <div
              style={{
                width: 128,
                height: 128,
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: `0 0 0 5px ${light ? "#FFFFFF" : "#18191B"}, 0 0 0 8px ${accentInk(theme.accent, light)}`,
              }}
            >
              <Img src={file(face)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 50, color: ink, lineHeight: 1.1 }}>{name}</div>
            {role && <div style={{ fontFamily: FONT.sans, fontSize: 32, color: muted, marginTop: 6 }}>{role}</div>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {logos.slice(0, 3).map((src, i) => {
              const lp = enterP(frame, fps, 0.3 + i * 0.12, 10);
              return (
                <div
                  key={i}
                  style={{
                    // pill that grows with the logo, so wide wordmarks stay legible
                    height: 84,
                    minWidth: 84,
                    boxSizing: "border-box",
                    padding: "0 20px",
                    borderRadius: 22,
                    background: "#FFFFFF",
                    boxShadow: "0 8px 22px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: lp,
                    transform: `scale(${0.6 + 0.4 * lp})`,
                  }}
                >
                  <Img src={file(src)} style={{ height: 40, width: "auto", maxWidth: 170, objectFit: "contain" }} />
                </div>
              );
            })}
          </div>
        </div>

        {media && (
          <div style={{ position: "relative", marginTop: 26, height: mediaH, borderRadius: 26, overflow: "hidden" }}>
            {/\.(mp4|mov|webm|m4v)$/i.test(media) ? (
              // real footage / a screen recording of the company's site
              <OffthreadVideo
                src={file(media)}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})` }}
              />
            ) : (
              <Img
                src={file(media)}
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})` }}
              />
            )}
            {mediaTag && (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 18,
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(15,15,15,0.72)",
                  fontFamily: FONT.sans,
                  fontWeight: 600,
                  fontSize: 24,
                  color: KIT.white,
                }}
              >
                {mediaTag}
              </div>
            )}
          </div>
        )}

        {/* story beats: a little timeline */}
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 18 }}>
          {beats.map((b, i) => {
            const bp = enterP(frame, fps, b.at, 12);
            if (bp <= 0.001) return <div key={i} style={{ height: b.big ? 92 : 44 }} />;
            const dot = interpolate(frame, [b.at * fps, b.at * fps + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, ...blurIn(bp, 14, 10) }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: b.big ? accentInk(theme.accent, light) : light ? "#C9CBD0" : "#4B4D52",
                    transform: `scale(${dot})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: b.big ? FONT.display : FONT.sans,
                    fontWeight: b.big ? 400 : 500,
                    fontSize: b.big ? 92 : 42,
                    lineHeight: 1.05,
                    color: b.big ? accentInk(theme.accent, light) : ink,
                  }}
                >
                  {b.text}
                </span>
              </div>
            );
          })}
        </div>

        {source && (
          <div style={{ marginTop: 26, fontFamily: FONT.sans, fontSize: 24, color: muted }}>Source: {source}</div>
        )}
      </div>
      </div>
    </Stage>
  );
};
