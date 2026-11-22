import React from "react";
import { AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../theme/tokens";
import { Stage } from "./Stage";
import { HighlightStroke, strokeDur, sweepP } from "./Highlighter";
import { blurIn, easeInOut, enterP } from "./motion";
import { KIT, FONT, highlighterFor } from "./tokens";
import type { KitBrowserProps } from "./types";

const W = 960; // window width on the 1080 canvas
const HEADER = 72;
// keeps the window between the top caption (y≈250) and Instagram's bottom UI
const MAX_CONTENT_H = 1080;

/**
 * browser — a real screenshot (Google search, source page) shown in a clean
 * light browser window. The camera scrolls/zooms to the `focus` region and a
 * highlighter-pen stroke sweeps over each highlight on cue. Proof on screen, in the
 * channel's look. Screenshots come from tools/capture.mjs (use --find to get
 * the highlight boxes).
 */
export const KitBrowser: React.FC<KitBrowserProps & { durationSec: number }> = ({
  bg = "light",
  src,
  srcWidth,
  srcHeight,
  url,
  focus,
  // the zoom starts on entry, so a receipt never sits static for a second or two
  zoomAt = 0.1,
  maxZoom = 2.2,
  highlights = [],
  label,
  credit,
  from = 0,
  pageTone = "light",
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = bg === "light";
  const marker = highlighterFor(theme.accent);

  const s = W / srcWidth;
  const contentH = Math.min(MAX_CONTENT_H, srcHeight * s);
  const left = (1080 - W) / 2;
  const top = Math.max(410, (1920 - (HEADER + contentH)) / 2);

  // 1) scroll inside the window so the focus sits in the upper-middle
  const maxScroll = Math.max(0, srcHeight * s - contentH);
  const wantScroll = focus ? Math.min(maxScroll, Math.max(0, focus.y * s - contentH * 0.32)) : 0;
  // scroll and zoom run TOGETHER, starting at zoomAt (default 0.1s), ~0.55s long
  const zStart = Math.min(zoomAt, 0.6) * fps;
  const moveFrames = 16;
  const scrollK = interpolate(frame, [zStart, zStart + moveFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const scroll = wantScroll * scrollK;

  // 2) camera zoom onto the focus (scale about the focus point, then centre it)
  const zoomK = focus
    ? interpolate(frame, [zStart, zStart + moveFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeInOut,
      })
    : 0;
  const fx = focus ? left + (focus.x + focus.w / 2) * s : 540;
  const fy = focus ? top + HEADER + (focus.y + focus.h / 2) * s - wantScroll : 960;
  // fit the focus to ~1000 px wide; never zoom so far that its edges get cut
  const z = focus ? Math.min(maxZoom, Math.max(1.05, 1000 / Math.max(1, focus.w * s))) : 1;
  const zoom = 1 + (z - 1) * zoomK;
  const dx = (540 - fx) * zoomK;
  const dy = (980 - fy) * zoomK;
  // gentle drift so it never freezes
  const total = Math.max(1, Math.round(durationSec * fps));
  const drift = interpolate(frame, [0, total], [0, 1], { extrapolateRight: "clamp" });

  const appear = enterP(frame, fps, 0, 14);
  const host = url ? url.replace(/^https?:\/\//, "") : "";
  // label belongs to the establishing shot; it fades as the camera dives in
  const labelP = enterP(frame, fps, 0.1) * (1 - zoomK);
  const band = light ? "240,240,241" : "15,15,15";

  return (
    <Stage bg={bg} camera="none" durationSec={durationSec}>
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px, ${dy - 14 * drift}px) scale(${zoom * (1 + 0.025 * drift)})`,
          transformOrigin: `${fx}px ${fy}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: W,
            borderRadius: 26,
            overflow: "hidden",
            background: "#FFFFFF",
            boxShadow: light
              ? "0 40px 90px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)"
              : "0 40px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12)",
            ...blurIn(appear, 40, 16),
          }}
        >
          <div
            style={{
              height: HEADER,
              background: "#F1F3F4",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 24px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#C4C7CC" }} />
            ))}
            {host && (
              <div
                style={{
                  marginLeft: 18,
                  flex: 1,
                  height: 42,
                  borderRadius: 21,
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 20px",
                  fontFamily: FONT.sans,
                  fontSize: 22,
                  color: "#5F6368",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <svg width="16" height="18" viewBox="0 0 16 18">
                  <rect x="2" y="8" width="12" height="9" rx="2" fill="#5F6368" />
                  <path d="M4.5 8 V5.5 a3.5 3.5 0 0 1 7 0 V8" stroke="#5F6368" strokeWidth="2" fill="none" />
                </svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{host}</span>
              </div>
            )}
          </div>
          <div style={{ position: "relative", width: W, height: contentH, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: -scroll, width: W, height: srcHeight * s }}>
              {/\.(mp4|mov|webm|m4v)$/i.test(src) ? (
                // a real screen recording of the site (capture.mjs record)
                <OffthreadVideo
                  src={staticFile(src)}
                  startFrom={Math.round(from * fps)}
                  muted
                  style={{ width: W, height: srcHeight * s, display: "block" }}
                />
              ) : (
                <Img src={staticFile(src)} style={{ width: W, height: srcHeight * s, display: "block" }} />
              )}
              {highlights.map((h, i) => {
                // highlighter pen, not a box: the band overshoots the phrase a
                // little at each end and sits a hair low, like a real marker
                const over = h.h * s * 0.16;
                const onScreen = (h.w * s + over * 2) * z;
                const hp = sweepP(frame, fps, h.at, strokeDur(onScreen));
                return (
                  <HighlightStroke
                    key={i}
                    left={h.x * s - over}
                    top={h.y * s + h.h * s * 0.04}
                    width={h.w * s + over * 2}
                    height={h.h * s * 0.98}
                    color={marker}
                    p={hp}
                    seed={i + 1}
                    // multiply vanishes on a dark site; there it's a translucent band
                    multiply={pageTone !== "dark"}
                    style={pageTone === "dark" ? { opacity: 0.45 } : undefined}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* clean band so the top caption never sits on zoomed page content */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 470,
          background: `linear-gradient(180deg, rgba(${band},1) 0%, rgba(${band},1) 76%, rgba(${band},0) 100%)`,
          opacity: zoomK,
          pointerEvents: "none",
        }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            left,
            top: top - 66,
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: 30,
            color: light ? KIT.mutedInk : KIT.muted,
            ...blurIn(labelP),
          }}
        >
          {label}
        </div>
      )}
      {credit && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, display: "flex", justifyContent: "center", opacity: appear }}>
          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              background: light ? "rgba(255,255,255,0.92)" : "rgba(15,15,15,0.85)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: 24,
              color: light ? KIT.mutedInk : KIT.muted,
            }}
          >
            {credit}
          </div>
        </div>
      )}
    </Stage>
  );
};
