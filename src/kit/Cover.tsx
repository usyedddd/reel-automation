import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { HighlightStroke } from "./Highlighter";
import { KIT, FONT, highlighterFor } from "./tokens";

/**
 * Reel cover / thumbnail (1080x1920). Everything that matters sits inside the
 * Instagram profile-grid 3:4 centre crop (y 240..1680). Fill it with the
 * reel's real material: the person's photo, the key number, true-colour logos.
 */

const Chip: React.FC<{ src: string; h?: number }> = ({ src, h = 86 }) => (
  <div
    style={{
      height: h,
      minWidth: h,
      boxSizing: "border-box",
      padding: `0 ${h * 0.22}px`,
      borderRadius: h * 0.28,
      background: "#FFFFFF",
      boxShadow: "0 14px 34px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Img src={staticFile(src)} style={{ height: h * 0.46, width: "auto", maxWidth: h * 1.9 }} />
  </div>
);

type StoryCoverProps = {
  accent: string;
  kicker: string;
  line1: string;
  big: string;
  line3: string;
  photo: string;
  photoPos?: string;
  photoScale?: number;
  photoTag: string;
  sticker?: string;
  chips?: string[];
  source?: string;
  /** your handle, shown under the cover */
  handle?: string;
};

export const StoryCover: React.FC<StoryCoverProps> = ({
  accent,
  kicker,
  line1,
  big,
  line3,
  photo,
  photoPos = "50% 40%",
  photoScale = 1,
  photoTag,
  sticker,
  chips = [],
  source,
  handle = "@yourhandle",
}) => {
  const marker = highlighterFor(accent);
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(130% 85% at 50% 38%, #FBFBFB 0%, #F0F0F1 55%, #E3E4E6 100%)",
        fontFamily: FONT.sans,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -220,
          right: -220,
          top: 880,
          height: 820,
          background: `radial-gradient(50% 50% at 50% 50%, ${accent}50 0%, transparent 70%)`,
        }}
      />
      <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 26px",
            borderRadius: 999,
            background: "#0F0F0F",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 7, background: accent, boxShadow: `0 0 12px ${accent}` }} />
          {kicker}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 362,
          left: 40,
          right: 40,
          textAlign: "center",
          fontFamily: FONT.display,
          textTransform: "uppercase",
          color: KIT.ink,
          lineHeight: 0.92,
        }}
      >
        <div style={{ fontSize: 150, letterSpacing: "0.01em" }}>{line1}</div>
        <div style={{ fontSize: 330, lineHeight: 0.98 }}>
          <span style={{ position: "relative", display: "inline-block", padding: "0 18px" }}>
            <HighlightStroke
              left={-4}
              top={330 * 0.2}
              width="calc(100% + 8px)"
              height={330 * 0.74}
              color={marker}
              p={1}
              multiply={false}
              seed={2}
            />
            <span style={{ position: "relative" }}>{big}</span>
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT.sans,
            textTransform: "none",
            fontWeight: 800,
            fontSize: 70,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {line3}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 998,
          left: 95,
          width: 890,
          height: 520,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(0,0,0,0.28)",
          transform: "rotate(-2.5deg)",
          border: "8px solid #FFFFFF",
          background: "#0F0F0F",
        }}
      >
        <Img
          src={staticFile(photo)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: photoPos,
            transform: `scale(${photoScale})`,
            transformOrigin: photoPos,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 22,
            bottom: 22,
            padding: "12px 22px",
            borderRadius: 999,
            background: "rgba(15,15,15,0.86)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          {photoTag}
        </div>
      </div>
      {sticker && (
        <div
          style={{
            position: "absolute",
            top: 942,
            right: 58,
            padding: "14px 28px",
            borderRadius: 999,
            background: "#0F0F0F",
            color: "#FFFFFF",
            fontFamily: FONT.display,
            fontSize: 56,
            lineHeight: 1,
            transform: "rotate(4deg)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          }}
        >
          {sticker}
        </div>
      )}
      {chips.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 1566,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
          }}
        >
          {chips.map((c) => (
            <Chip key={c} src={c} />
          ))}
        </div>
      )}
      {source && chips.length === 0 && (
        <div style={{ position: "absolute", top: 1590, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              fontWeight: 600,
              fontSize: 30,
              color: KIT.mutedInk,
            }}
          >
            {source}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", top: 1712, left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: 32, color: KIT.mutedInk }}>
        {handle}
      </div>
    </AbsoluteFill>
  );
};
